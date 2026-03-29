"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Upload, ImageIcon, AlertCircle, Package } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { upload } from "@vercel/blob/client"

interface EmptySpace {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

interface AnalysisItem {
  product_name: string | null
  status: "OOS"
  confidence: number
  empty_space: EmptySpace
}

interface AnalysisResult {
  analysis_result: {
    shelf_id: string
    items: AnalysisItem[]
  }
}

export default function AnalyzeShelfPage() {
  const router = useRouter()
  const { session, sessionLoading, authFetch } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [storeId, setStoreId] = useState("STORE001")
  const [shelfId, setShelfId] = useState("SHELF001A")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) {
      router.push("/")
    }
  }, [session, sessionLoading, router])

  // Draw bounding boxes on canvas when result changes
  useEffect(() => {
    if (!result || !previewUrl || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    console.log("[v0] useEffect triggered - result:", !!result, "previewUrl:", !!previewUrl)
    
    const img = new Image()
    img.onerror = (e) => {
      console.error("[v0] Image load error:", e)
    }
    img.onload = () => {
      console.log("[v0] Canvas drawing - image loaded, size:", img.width, "x", img.height)
      console.log("[v0] Items to draw:", result.analysis_result.items.length)
      
      imageRef.current = img
      
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw the image
      ctx.drawImage(img, 0, 0)
      
      // Scale factor based on image size (for large images, make lines/text bigger)
      const scale = Math.max(img.width, img.height) / 1000
      const lineWidth = Math.max(3, Math.round(6 * scale))
      const fontSize = Math.max(14, Math.round(24 * scale))
      const labelPadding = Math.max(6, Math.round(10 * scale))
      
      // Draw empty space boxes for each item (coordinates are in pixels)
      result.analysis_result.items.forEach((item) => {
        const box = item.empty_space
        if (!box) return
        
        // Coordinates are in pixels
        const x = box.x_min
        const y = box.y_min
        const width = box.x_max - box.x_min
        const height = box.y_max - box.y_min

        // Color for OOS items
        const strokeColor = "#ef4444"
        const fillColor = "rgba(239, 68, 68, 0.3)"

        // Draw filled rectangle
        ctx.fillStyle = fillColor
        ctx.fillRect(x, y, width, height)

        // Draw border
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = lineWidth
        ctx.strokeRect(x, y, width, height)

        // Draw label with product name
        const labelText = item.product_name || "空きスペース"
        ctx.font = `bold ${fontSize}px sans-serif`
        const textMetrics = ctx.measureText(labelText)
        const labelHeight = fontSize + labelPadding * 2

        // Draw label background at top of box
        ctx.fillStyle = strokeColor
        ctx.fillRect(x, y - labelHeight - 4, textMetrics.width + labelPadding * 2, labelHeight)

        // Draw label text
        ctx.fillStyle = "#ffffff"
        ctx.fillText(labelText, x + labelPadding, y - labelPadding - 4)
        
        // Draw confidence percentage
        const confidenceText = `${Math.round(item.confidence * 100)}%`
        const smallFontSize = Math.max(12, Math.round(18 * scale))
        ctx.font = `bold ${smallFontSize}px sans-serif`
        const confMetrics = ctx.measureText(confidenceText)
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.fillRect(x + width - confMetrics.width - labelPadding * 2, y + labelPadding, confMetrics.width + labelPadding * 2, smallFontSize + labelPadding)
        ctx.fillStyle = "#ffffff"
        ctx.fillText(confidenceText, x + width - confMetrics.width - labelPadding, y + labelPadding + smallFontSize)
      })
    }
    img.src = previewUrl
  }, [result, previewUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Use original file directly - no compression
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setResult(null)
      setError(null)
    }
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setError("画像ファイルを選択してください")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Step 1: Upload image directly to Blob storage from client (bypasses Vercel payload limit)
      const blob = await upload(`shelf-images/${Date.now()}-${selectedFile.name}`, selectedFile, {
        access: "public",
        handleUploadUrl: `/api/analyzeshelf/upload?token=${encodeURIComponent(session?.token || "")}`,
      })

      // Step 2: Call analyze API with blob URL (server fetches from Blob and sends to external API)
      const response = await authFetch("/api/analyzeshelf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blobUrl: blob.url,
          storeId,
          shelfId,
          timestamp: new Date().toISOString(),
        }),
      })

      const responseText = await response.text()
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(`レスポンスの解析に失敗: ${responseText.substring(0, 100)}`)
      }

      if (!response.ok) {
        throw new Error(data.error || data.detail || "分析に失敗しました")
      }

      setResult(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "分析中にエラーが発生しました"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }



  if (sessionLoading || !session?.authenticated) {
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
          <div className="flex items-center gap-4">
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
          <h1 className="text-lg font-semibold text-foreground">棚ウォッチャー</h1>
          <div className="w-[180px]" />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">棚画像分析</h2>
          <p className="mt-2 text-muted-foreground">
            棚の画像をアップロードして、欠品や補充が必要な商品を自動検出します
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>分析設定</CardTitle>
              <CardDescription>店舗・棚情報と画像をアップロードしてください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeId">店舗ID</Label>
                  <Input
                    id="storeId"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    placeholder="STORE001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shelfId">棚ID</Label>
                  <Input
                    id="shelfId"
                    value={shelfId}
                    onChange={(e) => setShelfId(e.target.value)}
                    placeholder="SHELF001A"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>棚画像</Label>
                <div
                  className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-[300px] rounded-lg object-contain"
                    />
                  ) : (
                    <>
                      <ImageIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">クリックして画像を選択</p>
                      <p className="text-xs text-muted-foreground">JPEG, PNG対応</p>
                    </>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isLoading || !selectedFile}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    分析を開始
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle>分析結果</CardTitle>
              <CardDescription>検出された空きスペース（欠品箇所）</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-lg bg-red-500/10 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {result.analysis_result.items.length}
                    </p>
                    <p className="text-sm text-muted-foreground">空きスペース検出</p>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {result.analysis_result.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <div>
                            <p className="font-medium">
                              {item.product_name || "商品名不明"}
                            </p>
                            {item.empty_space && (
                              <p className="text-xs text-muted-foreground">
                                位置: ({item.empty_space.x_min}, {item.empty_space.y_min})
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">欠品</Badge>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              信頼度: {Math.round((item.confidence || 0) * 100)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center text-muted-foreground">
                  <Package className="mb-2 h-10 w-10" />
                  <p>分析結果がここに表示されます</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Image with Bounding Boxes */}
        {result && previewUrl && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>検出結果の可視化</CardTitle>
              <CardDescription>
                画像上に検出された空きスペースを赤色の四角で表示しています。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border">
                <canvas ref={canvasRef} className="max-w-full" />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
