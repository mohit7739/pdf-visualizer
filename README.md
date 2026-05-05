# NCERT Visual Mapper

An AI-powered tool that processes educational PDFs (like NCERT textbooks), slices them by paragraph, and generates side-by-side visual explanations using AI and Mermaid.js diagrams.

## Features

- **PDF Parsing**: Automatically extracts text blocks from PDF pages, focusing on significant paragraphs.
- **AI Summarization**: Generates simple, concise summaries of textbook paragraphs suitable for 10th-grade understanding.
- **Visual Diagrams**: Automatically generates relevant Mermaid.js diagrams (flowcharts, mindmaps, pie charts, timelines) to visualize concepts.
- **Multi-Provider AI Support**: Defaults to Groq (Llama) for fast, free generation, with Google Gemini as a fallback option.
- **Beautiful UI**: Modern, responsive React frontend.

## Project Structure

- `/backend`: FastAPI Python server for PDF processing and AI orchestration.
- `/frontend`: React + Vite application for the user interface.

## Getting Started

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Set up your API keys:
```bash
cp .env.example .env
```
Edit `.env` and add your Groq API key (get one for free at [console.groq.com](https://console.groq.com/keys)).

Run the backend:
```bash
uvicorn main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
