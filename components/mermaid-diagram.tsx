"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"

interface MermaidDiagramProps {
  chart: string
}

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "inherit",
})

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current || !chart.trim()) return

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`
        const { svg } = await mermaid.render(id, chart.trim())
        setSvg(svg)
        setError(null)
      } catch (err) {
        console.error("Mermaid rendering error:", err)
        setError("ダイアグラムの描画に失敗しました")
        setSvg("")
      }
    }

    renderChart()
  }, [chart])

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">{chart}</pre>
      </div>
    )
  }

  if (!svg) {
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
