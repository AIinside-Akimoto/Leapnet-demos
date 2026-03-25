"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, Send, FileText, Code, BookOpen, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import { MarkdownWithMermaid } from "@/components/markdown-with-mermaid"

interface ApiResponse {
  overview: string
  system_prompt: string
  input_specification: Record<string, unknown>
  output_specification: Record<string, unknown>
  design_notes: string
  sample_input: Record<string, unknown>
  sample_output: Record<string, unknown>
  business_specification: string
}

export default function DocsGeneratorPage() {
  const router = useRouter()
  const { session, sessionLoading } = useAuth()
  const [transcription, setTranscription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) {
      router.push("/")
    }
  }, [session, sessionLoading, router])

  async function handleSubmit() {
    if (!transcription.trim()) {
      setError("テキストを入力してください")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/docsgenerator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcription }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "エラーが発生しました")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session?.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              ダッシュボードに戻る
            </Button>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-semibold text-foreground">AIエージェント設計支援</h1>
            <p className="text-sm text-muted-foreground">{session.username}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              音声文字起こしテキスト入力
            </CardTitle>
            <CardDescription>
              音声から文字起こしされた日本語のテキストを入力してください。AIエージェントの設計図が自動生成されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="例: 経費精算のレシートをチェックするエージェントを作りたい。金額と日付、店名を抽出して、規定の3000円を超えている場合は警告を出してほしい。あと、飲み屋さんの場合は交際費として分類して。"
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              rows={6}
              className="resize-none"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !transcription.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  設計を生成
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  概要
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{result.overview}</p>
              </CardContent>
            </Card>

            {/* Design Notes */}
            {result.design_notes && (
              <Card>
                <CardHeader>
                  <CardTitle>設計メモ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{result.design_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Tabs for System Prompt and Business Spec */}
            <Tabs defaultValue="system_prompt" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="system_prompt" className="gap-2">
                  <Code className="h-4 w-4" />
                  システムプロンプト
                </TabsTrigger>
                <TabsTrigger value="business_spec" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  業務仕様書
                </TabsTrigger>
              </TabsList>
              <TabsContent value="system_prompt">
                <Card>
                  <CardHeader>
                    <CardTitle>システムプロンプト</CardTitle>
                    <CardDescription>
                      AIエージェントに設定するMarkdown形式のシステムプロンプト
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] rounded-md border p-4">
                      <MarkdownWithMermaid content={result.system_prompt} />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="business_spec">
                <Card>
                  <CardHeader>
                    <CardTitle>業務仕様書</CardTitle>
                    <CardDescription>
                      業務フローや判断基準を含む詳細な業務仕様書
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] rounded-md border p-4">
                      <MarkdownWithMermaid content={result.business_specification} />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Input/Output Specifications */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>入力仕様</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(result.input_specification, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>出力仕様</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(result.output_specification, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Sample Input/Output */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>サンプル入力</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(result.sample_input, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>サンプル出力</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
                      {JSON.stringify(result.sample_output, null, 2)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
