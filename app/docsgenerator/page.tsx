"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, Send, FileText, Code, BookOpen, Lightbulb, Copy, Check, Mic, MicOff } from "lucide-react"
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
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Audio recording states (using OpenAI Whisper)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { authFetch } = useAuth()

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      
      audioChunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        if (audioChunksRef.current.length === 0) return

        setIsTranscribing(true)
        setError(null)

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          const formData = new FormData()
          formData.append("audio", audioBlob, "recording.webm")

          const response = await authFetch("/api/transcribe", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "文字起こしに失敗しました")
          }

          const data = await response.json()
          if (data.text) {
            setTranscription((prev) => prev ? prev + "\n" + data.text : data.text)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "文字起こしに失敗しました")
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Recording error:", err)
      setError("マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。")
    }
  }, [authFetch])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    setIsRecording(false)
  }, [])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  async function handleCopy(content: string, field: string) {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

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
            <div className="relative">
              <Textarea
                placeholder="例: 経費精算のレシートをチェックするエージェントを作りたい。金額と日付、店名を抽出して、規定の3000円を超えている場合は警告を出してほしい。あと、飲み屋さんの場合は交際費として分類して。"
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                rows={6}
                className="resize-none pr-12"
              />
              <Button
                type="button"
                variant={isRecording ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleRecording}
                disabled={isTranscribing}
                className="absolute right-2 top-2"
                title={isRecording ? "録音を停止" : "音声入力を開始（Whisper）"}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isRecording && (
              <p className="text-sm text-destructive animate-pulse">
                録音中...話し終わったらボタンを押して停止してください
              </p>
            )}
            {isTranscribing && (
              <p className="text-sm text-primary animate-pulse flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Whisperで文字起こし中...
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !transcription.trim() || isRecording || isTranscribing}
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
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle>システムプロンプト</CardTitle>
                      <CardDescription>
                        AIエージェントに設定するMarkdown形式のシステムプロンプト
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(result.system_prompt, "system_prompt")}
                      className="gap-2"
                    >
                      {copiedField === "system_prompt" ? (
                        <>
                          <Check className="h-4 w-4" />
                          コピーしました
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          コピー
                        </>
                      )}
                    </Button>
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
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle>業務仕様書</CardTitle>
                      <CardDescription>
                        業務フローや判断基準を含む詳細な業務仕様書
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(result.business_specification, "business_spec")}
                      className="gap-2"
                    >
                      {copiedField === "business_spec" ? (
                        <>
                          <Check className="h-4 w-4" />
                          コピーしました
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          コピー
                        </>
                      )}
                    </Button>
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
