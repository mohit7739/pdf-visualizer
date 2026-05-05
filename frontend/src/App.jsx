import { useCallback, useState, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import mermaid from 'mermaid'
import {
  Upload,
  FileText,
  Sparkles,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  AlertCircle,
  Loader2,
  ArrowUpFromLine,
  LayoutPanelLeft,
  Eye,
} from 'lucide-react'
import './index.css'

// ─── Mermaid Init (Light Theme — supports all diagram types) ───────────────
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    // General
    primaryColor: '#faf5f2',
    primaryBorderColor: '#c96442',
    primaryTextColor: '#1a1a1a',
    lineColor: '#d4845f',
    secondaryColor: '#f5f0eb',
    secondaryBorderColor: '#d4845f',
    tertiaryColor: '#fff8f5',
    tertiaryBorderColor: '#e8c4b0',
    fontFamily: 'Inter, sans-serif',
    fontSize: '13px',
    background: '#ffffff',
    mainBkg: '#faf5f2',
    nodeBorder: '#c96442',
    // Pie chart
    pie1: '#c96442',
    pie2: '#d4845f',
    pie3: '#e8a87c',
    pie4: '#5b8a72',
    pie5: '#7ab09a',
    pie6: '#4a7c9b',
    pie7: '#8b6fb0',
    pieStrokeColor: '#ffffff',
    pieOuterStrokeColor: '#e8e5e0',
    pieTitleTextColor: '#1a1a1a',
    pieSectionTextColor: '#ffffff',
    // Sequence diagram
    actorBkg: '#faf5f2',
    actorBorder: '#c96442',
    actorTextColor: '#1a1a1a',
    signalColor: '#1a1a1a',
    signalTextColor: '#1a1a1a',
    activationBorderColor: '#c96442',
    activationBkgColor: '#fff0e8',
    sequenceNumberColor: '#ffffff',
    noteBkgColor: '#fff8f5',
    noteBorderColor: '#e8c4b0',
    noteTextColor: '#4a4a4a',
    // Timeline
    cScale0: '#c96442',
    cScale1: '#5b8a72',
    cScale2: '#4a7c9b',
    cScale3: '#8b6fb0',
    cScale4: '#d4845f',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 15,
  },
  mindmap: {
    padding: 20,
  },
  securityLevel: 'loose',
})

// ─── MermaidDiagram Component ──────────────────────────────────────────────
function MermaidDiagram({ code, id }) {
  const containerRef = useRef(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!code || !containerRef.current) return

    const renderDiagram = async () => {
      try {
        const uniqueId = `mermaid-${id}-${Date.now()}`
        containerRef.current.innerHTML = ''
        const { svg } = await mermaid.render(uniqueId, code)
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          setError(false)
        }
      } catch (err) {
        console.warn('Mermaid render failed:', err)
        setError(true)
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
      }
    }

    renderDiagram()
  }, [code, id])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center rounded-lg"
           style={{ background: '#faf5f2', border: '1px dashed var(--color-border)' }}>
        <AlertCircle className="w-7 h-7 mb-2" style={{ color: 'var(--color-text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Diagram couldn't be rendered
        </p>
        <pre className="mt-3 p-3 rounded-lg text-xs text-left overflow-x-auto w-full max-h-40"
             style={{ background: '#f5f0eb', color: 'var(--color-text-secondary)' }}>
          {code}
        </pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container flex items-center justify-center w-full min-h-[120px]"
    />
  )
}

// ─── SlideCard Component ───────────────────────────────────────────────────
function SlideCard({ block, index }) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-700 ${
        isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-8'
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Card Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
             style={{ background: '#faf5f2', color: 'var(--color-primary)', border: '1px solid #efe5de' }}>
          <BookOpen className="w-3 h-3" />
          Page {block.page_number}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
             style={{ background: 'var(--color-surface-warm)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-light)' }}>
          Block {block.block_index + 1}
        </div>
      </div>

      {/* Split Screen Card */}
      <div className="clean-card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[280px]">
          {/* LEFT: Textbook Source */}
          <div className="p-5 flex flex-col"
               style={{ borderRight: '1px solid var(--color-border-light)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                Source Paragraph
              </span>
            </div>
            <div className="textbook-page flex-1 p-4 overflow-auto">
              <img
                src={`data:image/png;base64,${block.image_base64}`}
                alt={`PDF paragraph from page ${block.page_number}`}
                className="w-full h-auto object-contain"
                style={{ imageRendering: 'auto' }}
              />
            </div>
          </div>

          {/* RIGHT: AI Visual */}
          <div className="p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
              <span className="text-[11px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-primary)' }}>
                AI Explanation
              </span>
            </div>

            {/* Summary */}
            <div className="mb-4 p-4 rounded-lg"
                 style={{ background: '#faf5f2', border: '1px solid #efe5de' }}>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {block.summary}
                </p>
              </div>
            </div>

            {/* Mermaid Flowchart */}
            <div className="flex-1 p-4 rounded-lg overflow-auto"
                 style={{ background: 'var(--color-surface-warm)', border: '1px solid var(--color-border-light)' }}>
              <MermaidDiagram
                code={block.mermaid_code}
                id={`${block.page_number}-${block.block_index}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── UploadZone Component ──────────────────────────────────────────────────
function UploadZone({ onUpload, isProcessing }) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0])
      }
    },
    [onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: isProcessing,
  })

  return (
    <div className="max-w-xl mx-auto">
      <div
        {...getRootProps()}
        className={`dropzone rounded-xl p-10 text-center transition-all duration-300 ${
          isDragActive ? 'dropzone-active' : ''
        } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        style={{
          background: isDragActive ? 'rgba(201, 100, 66, 0.02)' : '#ffffff',
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isDragActive ? 'animate-pulse-glow' : ''
            }`}
            style={{
              background: '#faf5f2',
              border: '1px solid #efe5de',
            }}
          >
            {isDragActive ? (
              <ArrowUpFromLine className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            ) : (
              <Upload className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            )}
          </div>

          <div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {isDragActive ? 'Drop your PDF here' : 'Drag & drop your NCERT PDF'}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              or click to browse files · PDF format only
            </p>
          </div>

          {!isDragActive && (
            <button
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90"
              style={{
                background: 'var(--color-primary)',
                color: '#ffffff',
              }}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Select PDF
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ProcessingState Component ─────────────────────────────────────────────
function ProcessingState({ filename }) {
  const steps = [
    'Reading PDF pages...',
    'Extracting text blocks...',
    'Cropping paragraph images...',
    'Generating AI explanations...',
    'Building visual flowcharts...',
  ]
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="clean-card p-10">
        {/* Spinning loader */}
        <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center"
             style={{ background: '#faf5f2', border: '1px solid #efe5de' }}>
          <Loader2 className="w-6 h-6 animate-spin-slow" style={{ color: 'var(--color-primary)' }} />
        </div>

        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Processing your PDF
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {filename}
        </p>

        {/* Progress bar */}
        <div className="w-full rounded-full overflow-hidden mb-5"
             style={{ background: '#f5f0eb', height: '3px' }}>
          <div className="progress-bar w-full h-full" />
        </div>

        {/* Animated step text */}
        <div className="h-5 overflow-hidden">
          <p
            key={currentStep}
            className="text-sm font-medium animate-fade-in"
            style={{ color: 'var(--color-primary)' }}
          >
            {steps[currentStep]}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── ResultsHeader Component ───────────────────────────────────────────────
function ResultsHeader({ data, onReset }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6"
         style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: '#f0faf4', border: '1px solid #d4edda' }}>
            <LayoutPanelLeft className="w-4.5 h-4.5" style={{ color: 'var(--color-success)' }} />
          </div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Visual Map Ready
          </h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{data.filename}</span>
          {' '}· {data.total_pages} pages · {data.blocks.length} blocks extracted
        </p>
      </div>

      <button
        onClick={onReset}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-50"
        style={{
          background: '#ffffff',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <span className="flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          Upload New
        </span>
      </button>
    </div>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState('idle') // idle | processing | done | error
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filename, setFilename] = useState('')

  const handleUpload = async (file) => {
    setState('processing')
    setFilename(file.name)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Server error: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
      setState('done')
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setState('error')
    }
  }

  const handleReset = () => {
    setState('idle')
    setData(null)
    setError('')
    setFilename('')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-surface-warm)' }}>

      {/* Header */}
      <header className="sticky top-0 z-50"
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--color-border)',
              }}>
        <div className="max-w-5xl mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: 'var(--color-primary)' }}>
                <BrainCircuit className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                  NCERT Visual Mapper
                </h1>
              </div>
            </div>

            {state === 'done' && data && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                   style={{ background: '#f0faf4', color: 'var(--color-success)', border: '1px solid #d4edda' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
                {data.blocks.length} blocks mapped
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* IDLE: Upload Zone */}
        {state === 'idle' && (
          <div className="animate-fade-in">
            {/* Hero Section */}
            <div className="text-center mb-10 pt-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-5"
                   style={{ background: '#faf5f2', color: 'var(--color-primary)', border: '1px solid #efe5de' }}>
                <Sparkles className="w-3 h-3" />
                Powered by Gemini AI
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold mb-3 leading-tight"
                  style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                Transform Your Textbook
                <br />
                <span style={{ color: 'var(--color-primary)' }}>Into Visual Maps</span>
              </h2>
              <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--color-text-muted)' }}>
                Upload any NCERT PDF and get AI-generated summaries and flowcharts
                for every paragraph, side-by-side with the original text.
              </p>
            </div>

            <UploadZone onUpload={handleUpload} isProcessing={false} />

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-14 max-w-2xl mx-auto">
              {[
                { icon: FileText, title: 'PDF Slicing', desc: 'Extracts & crops individual paragraphs' },
                { icon: BrainCircuit, title: 'AI Summaries', desc: 'Simple 2-sentence breakdowns' },
                { icon: LayoutPanelLeft, title: 'Visual Flowcharts', desc: 'Mermaid.js concept diagrams' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="clean-card p-5 text-center hover:shadow-md transition-shadow duration-200">
                  <div className="w-9 h-9 mx-auto mb-3 rounded-lg flex items-center justify-center"
                       style={{ background: '#faf5f2', border: '1px solid #efe5de' }}>
                    <Icon className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <h3 className="text-sm font-semibold mb-0.5" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {state === 'processing' && (
          <ProcessingState filename={filename} />
        )}

        {/* ERROR */}
        {state === 'error' && (
          <div className="max-w-md mx-auto text-center py-20 animate-fade-in">
            <div className="clean-card p-10">
              <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
                   style={{ background: '#fef5f5', border: '1px solid #fde2e2' }}>
                <AlertCircle className="w-6 h-6" style={{ color: 'var(--color-error)' }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                Processing Failed
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {error}
              </p>
              <button
                onClick={handleReset}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:opacity-90"
                style={{
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* DONE: Results */}
        {state === 'done' && data && (
          <div className="animate-fade-in">
            <ResultsHeader data={data} onReset={handleReset} />

            {/* Slide Cards */}
            <div className="flex flex-col gap-7">
              {data.blocks.map((block, index) => (
                <SlideCard
                  key={`${block.page_number}-${block.block_index}`}
                  block={block}
                  index={index}
                />
              ))}
            </div>

            {/* Scroll to top */}
            <div className="text-center mt-10 pb-8">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-50"
                style={{
                  background: '#ffffff',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4 rotate-180" />
                  Back to top
                </span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
