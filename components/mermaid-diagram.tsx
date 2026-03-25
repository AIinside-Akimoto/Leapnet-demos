"use client"

import { useEffect, useRef, useState, useId } from "react"

interface MermaidDiagramProps {
  chart: string
}

let mermaidInitialized = false

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const uniqueId = useId().replace(/:/g, "-")

  useEffect(() => {
    let cancelled = false

    const renderChart = async () => {
      if (!chart.trim()) {
        setIsLoading(false)
        return
      }

      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import("mermaid")).default

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "default",
            securityLevel: "loose",
            fontFamily: "inherit",
          })
          mermaidInitialized = true
        }

        const id = `mermaid${uniqueId}-${Math.random().toString(36).substring(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim())
        
        if (!cancelled) {
          setSvg(renderedSvg)
          setError(null)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Mermaid rendering error:", err)
          setError("ダイアグラムの描画に失敗しました")
          setSvg("")
          setIsLoading(false)
        }
      }
    }

    renderChart()

    return () => {
      cancelled = true
    }
  }, [chart, uniqueId])

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto rounded-md bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
