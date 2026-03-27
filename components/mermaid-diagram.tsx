"use client"

import { useEffect, useRef, useState, useId } from "react"

interface MermaidDiagramProps {
  chart: string
}

let mermaidInitialized = false

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [hasError, setHasError] = useState(false)
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
            // Support for Japanese and special characters
            flowchart: {
              htmlLabels: true,
              useMaxWidth: true,
            },
          })
          mermaidInitialized = true
        }

        const id = `mermaid${uniqueId}-${Math.random().toString(36).substring(2, 9)}`
        const { svg: renderedSvg } = await mermaid.render(id, chart.trim())
        
        if (!cancelled) {
          setSvg(renderedSvg)
          setHasError(false)
          setIsLoading(false)
        }
      } catch {
        // On error, show the original markdown instead of error message
        if (!cancelled) {
          setHasError(true)
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

  // On error, show the original code block as markdown
  if (hasError) {
    return (
      <div className="rounded-md bg-muted/50 p-4 overflow-x-auto">
        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">{chart}</pre>
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
