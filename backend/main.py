"""
NCERT Visual Mapper - FastAPI Backend
Processes educational PDFs, slices them by paragraph, and generates
side-by-side AI visual explanations.

Supports two AI providers:
  1. Groq (FREE, generous limits) — uses Llama models
  2. Gemini (Google) — fallback if Groq key not set
"""

import os
import io
import json
import base64
import asyncio
import traceback
from typing import List, Optional

import httpx
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Configuration ───────────────────────────────────────────────────────────

# GROQ — Get your FREE key at https://console.groq.com/keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# GEMINI — Fallback, set if you have a working key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Which provider to use: "groq" or "gemini" (auto-detected based on which key is set)
AI_PROVIDER = "groq" if GROQ_API_KEY else ("gemini" if GEMINI_API_KEY else "none")

if GEMINI_API_KEY:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)

print(f"[Config] AI Provider: {AI_PROVIDER}")
print(f"[Config] Groq key set: {bool(GROQ_API_KEY)}")
print(f"[Config] Gemini key set: {bool(GEMINI_API_KEY)}")

app = FastAPI(
    title="NCERT Visual Mapper",
    description="Process educational PDFs and generate AI visual explanations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ──────────────────────────────────────────────────────────────────

class ParagraphBlock(BaseModel):
    page_number: int
    block_index: int
    raw_text: str
    image_base64: str  # base64 PNG of the cropped paragraph
    summary: Optional[str] = None
    mermaid_code: Optional[str] = None


class ProcessedPDF(BaseModel):
    filename: str
    total_pages: int
    blocks: List[ParagraphBlock]


# ─── PDF Processing ─────────────────────────────────────────────────────────

def extract_blocks_from_pdf(pdf_bytes: bytes, max_blocks_per_page: int = 4) -> List[dict]:
    """
    Use PyMuPDF to iterate through pages. For each page, extract the
    largest text blocks (by area), grab the raw text, and crop the
    bounding box into a base64 PNG image.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_blocks = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        # Get text blocks: (x0, y0, x1, y1, "text", block_no, block_type)
        # block_type 0 = text, 1 = image
        raw_blocks = page.get_text("blocks")

        # Filter to text blocks only (block_type == 0) and non-trivial text
        text_blocks = [
            b for b in raw_blocks
            if b[6] == 0  # text block
            and len(b[4].strip()) > 30  # skip tiny headers/footers
        ]

        # Sort by area (largest first) to grab the most significant blocks
        text_blocks.sort(
            key=lambda b: (b[2] - b[0]) * (b[3] - b[1]),
            reverse=True,
        )

        # Take the top N blocks
        top_blocks = text_blocks[:max_blocks_per_page]

        # Re-sort by vertical position (top to bottom reading order)
        top_blocks.sort(key=lambda b: b[1])

        for idx, block in enumerate(top_blocks):
            x0, y0, x1, y1 = block[0], block[1], block[2], block[3]
            text = block[4].strip()

            # Add padding around the crop for visual clarity
            padding = 10
            clip_rect = fitz.Rect(
                max(0, x0 - padding),
                max(0, y0 - padding),
                min(page.rect.width, x1 + padding),
                min(page.rect.height, y1 + padding),
            )

            # Render the clipped region at 2x resolution for clarity
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat, clip=clip_rect)
            img_bytes = pix.tobytes("png")
            img_b64 = base64.b64encode(img_bytes).decode("utf-8")

            all_blocks.append({
                "page_number": page_idx + 1,
                "block_index": idx,
                "raw_text": text,
                "image_base64": img_b64,
            })

    doc.close()
    return all_blocks


# ─── AI Orchestration ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert tutor and visual learning designer. Read this textbook paragraph carefully.

Return a JSON object with two keys:
1. "summary" — A simple 2-sentence breakdown for a 10th grader.
2. "mermaid_code" — Valid Mermaid.js code that BEST visualizes the concept.

CHOOSE the most appropriate diagram type based on the content:

- **mindmap** — For topics with a central concept and branching sub-topics.
  Example:
  mindmap
    root((Photosynthesis))
      Light Reactions
        Thylakoid Membrane
        Water Splitting
        ATP Production
      Dark Reactions
        Calvin Cycle
        Carbon Fixation
        Glucose Output

- **flowchart TD** — For step-by-step processes, cause-effect chains.
  Example:
  flowchart TD
    A[Sunlight hits leaf] --> B[Chlorophyll absorbs light]
    B --> C[Water molecules split]
    C --> D[Oxygen released]
    D --> E[Glucose produced]

- **pie** — For data with percentages or proportions.
  Example:
  pie title Composition of Air
    "Nitrogen" : 78
    "Oxygen" : 21
    "Other gases" : 1

- **timeline** — For historical events or sequential milestones.
  Example:
  timeline
    title History of Atomic Models
    1803 : Dalton Model - Solid sphere
    1897 : Thomson Model - Plum pudding
    1911 : Rutherford Model - Nuclear atom
    1913 : Bohr Model - Electron orbits

- **sequenceDiagram** — For interactions between different entities or organs.
  Example:
  sequenceDiagram
    participant M as Mouth
    participant S as Stomach
    participant I as Small Intestine
    M->>S: Food travels via esophagus
    S->>S: HCl and pepsin break proteins
    S->>I: Chyme moves to intestine
    I->>I: Nutrients absorbed into blood

- **block-beta** — For showing system architecture or classifications.
  Example:
  block-beta
    columns 3
    A["Kingdom Plantae"]:3
    B["Thallophyta"] C["Bryophyta"] D["Pteridophyta"]
    E["Gymnosperms"]:2 F["Angiosperms"]

STRICT RULES:
1. Pick the BEST diagram type for the content — do NOT always use flowchart.
2. Keep diagrams clean with 4-10 nodes maximum.
3. Do NOT use special characters like parentheses, colons, or quotes INSIDE node labels (except in pie chart labels which need quotes).
4. Do NOT use subgraphs in flowcharts.
5. Use simple, short labels — max 4-5 words per node.
6. For mindmap, always use root((...)) syntax for the center node.
7. Make the diagram educational and easy to understand.

Return ONLY the raw JSON object. No markdown formatting, no code fences, no explanation outside the JSON."""


# ─── Groq Provider (FREE — Llama) ───────────────────────────────────────────

async def _call_groq(text: str) -> dict:
    """Call Groq's free API with Llama model."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Paragraph:\n{text}"},
                ],
                "temperature": 0.3,
                "max_tokens": 1024,
            },
        )

        if response.status_code == 429:
            raise Exception("Rate limited (429)")

        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            content = "\n".join(lines)

        result = json.loads(content)
        return {
            "summary": result.get("summary", "No summary generated."),
            "mermaid_code": result.get("mermaid_code", "flowchart TD\n    A[No diagram available]"),
        }


# ─── Gemini Provider ────────────────────────────────────────────────────────

async def _call_gemini(text: str) -> dict:
    """Call Google Gemini API."""
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(
        [
            {"role": "user", "parts": [SYSTEM_PROMPT + "\n\nParagraph:\n" + text]},
        ],
        generation_config=genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1024,
        ),
    )

    response_text = response.text.strip()

    if response_text.startswith("```"):
        lines = response_text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines)

    result = json.loads(response_text)
    return {
        "summary": result.get("summary", "No summary generated."),
        "mermaid_code": result.get("mermaid_code", "flowchart TD\n    A[No diagram available]"),
    }


# ─── Main AI Function ───────────────────────────────────────────────────────

async def get_ai_explanation(text: str) -> dict:
    """
    Try the configured AI provider. Falls back to placeholder on failure.
    Order: Groq (if key set) → Gemini (if key set) → Fallback
    """
    providers = []
    if GROQ_API_KEY:
        providers.append(("Groq", _call_groq))
    if GEMINI_API_KEY:
        providers.append(("Gemini", _call_gemini))

    for name, call_fn in providers:
        for attempt in range(3):
            try:
                result = await call_fn(text)
                print(f"[AI OK] Provider={name}, attempt={attempt+1}")
                return result
            except Exception as e:
                error_str = str(e)
                is_rate_limit = "429" in error_str or "rate" in error_str.lower() or "quota" in error_str.lower()

                if is_rate_limit and attempt < 2:
                    wait_time = (attempt + 1) * 3
                    print(f"[AI Rate Limit] {name}, attempt={attempt+1}, retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    print(f"[AI Error] {name}: {e}")
                    break  # try next provider

    print("[AI] All providers failed, using fallback")
    return _generate_fallback(text)


def _generate_fallback(text: str) -> dict:
    """Generate a reasonable fallback when AI is not available."""
    words = text.split()
    short = " ".join(words[:20]) + ("..." if len(words) > 20 else "")
    return {
        "summary": f"This paragraph discusses: {short} Configure GROQ_API_KEY (free at console.groq.com) to enable AI summaries.",
        "mermaid_code": "flowchart TD\n    A[Paragraph Content] --> B[Key Concept]\n    B --> C[Details]\n    C --> D[Conclusion]",
    }


# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "NCERT Visual Mapper API",
        "docs": "/docs",
        "status": "running",
        "ai_provider": AI_PROVIDER,
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "ai_provider": AI_PROVIDER,
        "groq_configured": bool(GROQ_API_KEY),
        "gemini_configured": bool(GEMINI_API_KEY),
    }


@app.post("/upload", response_model=ProcessedPDF)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file. The backend will:
    1. Extract the largest text blocks per page
    2. Crop each block as a base64 PNG image
    3. Send each block's text to the LLM for summary + mermaid code
    4. Return everything as a structured JSON response
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        pdf_bytes = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read the uploaded file.")

    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    # Step 1: Extract text blocks + cropped images
    try:
        blocks = extract_blocks_from_pdf(pdf_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {str(e)}",
        )

    if not blocks:
        raise HTTPException(
            status_code=400,
            detail="No significant text blocks found in this PDF. It may be image-based or empty.",
        )

    # Step 2: Get AI explanations for each block
    processed_blocks = []
    for block_data in blocks:
        ai_result = await get_ai_explanation(block_data["raw_text"])
        processed_blocks.append(
            ParagraphBlock(
                page_number=block_data["page_number"],
                block_index=block_data["block_index"],
                raw_text=block_data["raw_text"],
                image_base64=block_data["image_base64"],
                summary=ai_result["summary"],
                mermaid_code=ai_result["mermaid_code"],
            )
        )

    # Count pages
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    total_pages = len(doc)
    doc.close()

    return ProcessedPDF(
        filename=file.filename,
        total_pages=total_pages,
        blocks=processed_blocks,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
