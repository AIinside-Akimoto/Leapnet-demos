"use client"

import { useState } from "react"
import { FileText, Copy, Check, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"

interface AgentResultProps {
  answer: string
  prompt: string
}

export function AgentResult({ answer, prompt }: AgentResultProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [copied, setCopied] = useState(false)

  // Parse answer to extract template section
  const templateMatch = answer.match(
    /(?:^[#\s\d.]*)(【.*?(?:テンプレート|シート|フォーム|書)】)/m
  )

  let explanation = answer
  let template = ""

  if (templateMatch && templateMatch.index !== undefined) {
    const fullMatch = answer.substring(templateMatch.index)
    const splitIndex = fullMatch.indexOf("【")
    const actualSplitIndex = templateMatch.index + splitIndex
    explanation = answer.substring(0, actualSplitIndex).replace(/[#\d.\s]+$/, "").trim()
    template = answer
      .substring(actualSplitIndex)
      .trim()
      .replace(/```text/g, "")
      .replace(/```/g, "")
      .trim()
  }

  async function copyTemplate() {
    await navigator.clipboard.writeText(template)
    setCopied(true)
    toast.success("テンプレートをコピーしました")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Prompt viewer */}
      <button
        onClick={() => setShowPrompt(!showPrompt)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPrompt ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        生成されたプロンプトを見る
      </button>
      {showPrompt && (
        <pre className="overflow-x-auto rounded-lg bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
          {prompt}
        </pre>
      )}

      {/* Main result - rendered as Markdown */}
      <div className="prose prose-sm max-w-none text-card-foreground leading-relaxed
        prose-headings:text-foreground prose-headings:font-bold
        prose-h1:text-xl prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-4
        prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
        prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
        prose-p:my-2 prose-p:text-card-foreground
        prose-strong:text-foreground prose-strong:font-semibold
        prose-ul:my-2 prose-ul:pl-5 prose-ul:list-disc
        prose-ol:my-2 prose-ol:pl-5 prose-ol:list-decimal
        prose-li:my-0.5 prose-li:text-card-foreground
        prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-code:text-foreground
        prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4
        prose-table:border-collapse prose-table:w-full
        prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-sm prose-th:font-semibold
        prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 prose-td:text-sm
        prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-muted/30 prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:italic prose-blockquote:text-muted-foreground
        prose-hr:border-border prose-hr:my-6
        prose-a:text-primary prose-a:underline prose-a:underline-offset-2
      ">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>

      {/* Template section */}
      {template && (
        <div className="rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              以下のテンプレートをコピーして使用してください
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyTemplate}
              className="h-7 gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  コピー
                </>
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-foreground font-mono whitespace-pre-wrap">
            {template}
          </pre>
        </div>
      )}
    </div>
  )
}
