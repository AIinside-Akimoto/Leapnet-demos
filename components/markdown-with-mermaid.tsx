"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { MermaidDiagram } from "./mermaid-diagram"
import type { Components } from "react-markdown"

interface MarkdownWithMermaidProps {
  content: string
}

export function MarkdownWithMermaid({ content }: MarkdownWithMermaidProps) {
  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "")
      const language = match?.[1]
      const codeContent = String(children).replace(/\n$/, "")

      // Handle mermaid code blocks
      if (language === "mermaid") {
        return <MermaidDiagram chart={codeContent} />
      }

      // Inline code
      if (!className) {
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono" {...props}>
            {children}
          </code>
        )
      }

      // Code block with syntax highlighting
      return (
        <div className="relative">
          {language && (
            <div className="absolute right-2 top-2 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto rounded-md bg-muted p-4">
            <code className={`${className} text-sm`} {...props}>
              {children}
            </code>
          </pre>
        </div>
      )
    },
    // Style other elements
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-xl font-semibold mt-5 mb-3 text-foreground">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="my-3 text-foreground leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="my-3 ml-6 list-disc space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-3 ml-6 list-decimal space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-foreground">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-primary pl-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted">{children}</thead>
    ),
    th: ({ children }) => (
      <th className="border border-border px-4 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-4 py-2">{children}</td>
    ),
    hr: () => (
      <hr className="my-6 border-border" />
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
