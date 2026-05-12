"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, Upload, FileText, AlertCircle, CheckCircle2, Copy, Check } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface FloorResult {
  floor: string
  status: "pending" | "processing" | "completed" | "error"
  result?: string
  error?: string
  elapsedTime?: number
}

export default function ConvertPdfToCadJsonPage() {
  const router = useRouter()
  const { session, sessionLoading, authFetch } = useAuth()
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExtractingFloors, setIsExtractingFloors] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [floors, setFloors] = useState<string[]>([])
  const [floorResults, setFloorResults] = useState<FloorResult[]>([])
  const [progress, setProgress] = useState(0)
  const [floorListElapsedTime, setFloorListElapsedTime] = useState<number | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) {
      router.push("/")
    }
  }, [session, sessionLoading, router])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Cancel any in-progress API call
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      setSelectedFile(file)
      setError(null)
      setFloors([])
      setFloorResults([])
      setProgress(0)
      setFloorListElapsedTime(null)
    }
  }

  async function extractFloorList() {
    if (!selectedFile) return

    setIsExtractingFloors(true)
    setError(null)
    setFloors([])
    setFloorResults([])
    setProgress(0)
    setFloorListElapsedTime(null)

    const startTime = performance.now()

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await authFetch("/api/extract-floorlist", {
        method: "POST",
        body: formData,
      })

      const endTime = performance.now()
      setFloorListElapsedTime(Math.round((endTime - startTime) / 10) / 100)

      const responseText = await response.text()

      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(`レスポンスの解析に失敗: ${responseText.substring(0, 100)}`)
      }

      if (!response.ok) {
        throw new Error(data.error || data.detail || "階数リスト抽出に失敗しました")
      }

      if (data.floors && Array.isArray(data.floors)) {
        setFloors(data.floors)
        // Initialize floor results
        setFloorResults(data.floors.map((floor: string) => ({
          floor,
          status: "pending" as const,
        })))
      } else {
        throw new Error("階数リストが見つかりませんでした")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsExtractingFloors(false)
    }
  }

  async function convertFloor(floor: string, index: number): Promise<void> {
    if (!selectedFile) return

    setFloorResults(prev => prev.map((r, i) => 
      i === index ? { ...r, status: "processing" as const } : r
    ))

    const startTime = performance.now()

    try {
      // Get proxy URL from server config
      const configResponse = await authFetch("/api/cad-proxy-config")
      if (!configResponse.ok) {
        throw new Error("プロキシ設定の取得に失敗しました")
      }
      const { proxyUrl } = await configResponse.json()

      // Call through Railway proxy to avoid Vercel 60s timeout
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("floor", floor)

      const response = await fetch(`${proxyUrl.replace(/\/$/, "")}/convert`, {
        method: "POST",
        body: formData,
      })

      const endTime = performance.now()
      const elapsedTime = Math.round((endTime - startTime) / 10) / 100

      const responseText = await response.text()

      if (!response.ok) {
        let errorMessage = `APIエラー: ${response.status}`
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorData.detail || errorMessage
        } catch {
          // ignore parse error
        }
        throw new Error(errorMessage)
      }

      // Format JSON for display
      let formattedJson: string
      try {
        const jsonData = JSON.parse(responseText)
        formattedJson = JSON.stringify(jsonData, null, 2)
      } catch {
        formattedJson = responseText
      }

      setFloorResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: "completed" as const, result: formattedJson, elapsedTime } : r
      ))
    } catch (err) {
      setFloorResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: "error" as const, error: err instanceof Error ? err.message : "エラー" } : r
      ))
    }
  }

  async function startConversion() {
    if (floors.length === 0) return

    setIsLoading(true)
    setProgress(0)

    // Process floors sequentially
    for (let i = 0; i < floors.length; i++) {
      await convertFloor(floors[i], i)
      setProgress(Math.round(((i + 1) / floors.length) * 100))
    }

    setIsLoading(false)
  }

  function handleCopy(index: number, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const completedCount = floorResults.filter(r => r.status === "completed").length
  const errorCount = floorResults.filter(r => r.status === "error").length

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">求積図変換</h1>
        </div>
      </header>

      <main className="container py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Description */}
          <p className="text-muted-foreground">
            求積図PDFをアップロードして、各階のCAD用JSONデータに変���します
          </p>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>ファイルアップロード</CardTitle>
              <CardDescription>
                求積図のPDFファイルまたは画像ファイルをアップロードしてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">
                  クリックしてファイルを選択
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF、PNG、JPG形式に対応
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                onClick={extractFloorList}
                disabled={!selectedFile || isExtractingFloors || isLoading}
                className="w-full"
              >
                {isExtractingFloors ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    階数リストを抽出中...
                  </>
                ) : (
                  "1. 階数リストを抽出"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Floor List */}
          {floors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>抽出された階数</span>
                  {floorListElapsedTime !== null && (
                    <span className="text-sm font-normal text-muted-foreground">
                      API処理時間: {floorListElapsedTime.toFixed(2)}秒
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {floors.length}階が検出されました
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {floors.map((floor, index) => {
                    const result = floorResults[index]
                    return (
                      <Badge
                        key={index}
                        variant={
                          result?.status === "completed" ? "default" :
                          result?.status === "error" ? "destructive" :
                          result?.status === "processing" ? "secondary" :
                          "outline"
                        }
                      >
                        {floor}階
                        {result?.status === "processing" && (
                          <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                        )}
                        {result?.status === "completed" && (
                          <CheckCircle2 className="ml-1 h-3 w-3" />
                        )}
                        {result?.status === "error" && (
                          <AlertCircle className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    )
                  })}
                </div>

                <Button
                  onClick={startConversion}
                  disabled={isLoading || isExtractingFloors}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      変換中... ({completedCount + errorCount}/{floors.length})
                    </>
                  ) : (
                    "2. 各階のCAD JSONに変換"
                  )}
                </Button>

                {isLoading && (
                  <Progress value={progress} className="w-full" />
                )}
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {floorResults.some(r => r.status === "completed" || r.status === "error") && (
            <Card>
              <CardHeader>
                <CardTitle>変換結果</CardTitle>
                <CardDescription>
                  完了: {completedCount} / エラー: {errorCount} / 合計: {floors.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {floorResults.map((result, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={result.status === "completed" ? "default" : result.status === "error" ? "destructive" : "outline"}>
                          {result.floor}階
                        </Badge>
                        {result.elapsedTime !== null && result.status === "completed" && (
                          <span className="text-xs text-muted-foreground">
                            {result.elapsedTime.toFixed(2)}秒
                          </span>
                        )}
                      </div>
                      {result.status === "completed" && result.result && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(index, result.result!)}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="mr-1 h-3 w-3" />
                              コピー済み
                            </>
                          ) : (
                            <>
                              <Copy className="mr-1 h-3 w-3" />
                              コピー
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {result.status === "completed" && result.result && (
                      <Textarea
                        value={result.result}
                        readOnly
                        className="min-h-[200px] font-mono text-xs"
                      />
                    )}
                    {result.status === "error" && result.error && (
                      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{result.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
