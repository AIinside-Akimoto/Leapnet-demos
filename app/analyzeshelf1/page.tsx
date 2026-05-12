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

interface FrontFaceGap {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

interface AnalysisItem {
  product_name: string | null
  status: "OOS" | "LOW_STOCK"
  front_face_gap: FrontFaceGap
  estimated_replenishment_qty: number
  priority: "High" | "Medium" | "Low"
  location: {
    row: number
    position: "Left" | "Center" | "Right"
  }
}

interface AnalysisResult {
  analysis_result: {
    shelf_id: string
    summary: {
      total_oos_items: number
      total_replenish_items: number
    }
    items: AnalysisItem[]
  }
}

// Helper function to get circled number (①②③...)
function getCircledNumber(n: number): string {
  const circledNumbers = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"]
  if (n >= 1 && n <= 20) {
    return circledNumbers[n - 1]
  }
  return `(${n})`
}

export default function AnalyzeShelfPage() {
  const router = useRouter()
  const { token, session, sessionLoading, authFetch } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [storeId, setStoreId] = useState("STORE001")
  const [shelfId, setShelfId] = useState("SHELF001A")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedTime, setElapsedTime] = useState<number | null>(null)

  // Sort items: OOS first, then by row, then by position (Left -> Center -> Right)
  const positionOrder: Record<string, number> = { Left: 0, Center: 1, Right: 2 }
  const sortItems = (items: AnalysisItem[]) => [...items].sort((a, b) => {
    const statusDiff = (a.status === "OOS" ? 0 : 1) - (b.status === "OOS" ? 0 : 1)
    if (statusDiff !== 0) return statusDiff
    const rowDiff = (a.location?.row ?? 0) - (b.location?.row ?? 0)
    if (rowDiff !== 0) return rowDiff
    return (positionOrder[a.location?.position ?? ""] ?? 0) - (positionOrder[b.location?.position ?? ""] ?? 0)
  })

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

    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw the image
      ctx.drawImage(img, 0, 0)

      // Calculate render scale: how much the canvas is scaled down for display
      // We want text to appear as fixed screen pixels regardless of image size
      let displayWidth = canvas.getBoundingClientRect().width || 800
      let renderScale = img.width / displayWidth
      
      const screenFontSize = 16 // screen pixels
      const fontSize = Math.round(screenFontSize * renderScale)
      const labelPadding = Math.round(4 * renderScale)
      const lineWidth = Math.max(1, Math.round(2 * renderScale))
      
      // Draw empty space boxes for each item (OOS first, then by row, then by position)
      const sortedItems = sortItems(result.analysis_result.items)
      sortedItems.forEach((item, index) => {
        const box = item.front_face_gap
        if (!box) return
        
        // Coordinates are 0-1 ratios, convert to canvas pixels
        const x = box.x_min * img.width
        const y = box.y_min * img.height
        const width = (box.x_max - box.x_min) * img.width
        const height = (box.y_max - box.y_min) * img.height

        // Color based on status
        const isOOS = item.status === "OOS"
        const strokeColor = isOOS ? "#ef4444" : "#f59e0b"
        const fillColor = isOOS ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"

        // Draw filled rectangle
        ctx.fillStyle = fillColor
        ctx.fillRect(x, y, width, height)

        // Draw border
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = lineWidth
        ctx.strokeRect(x, y, width, height)

        // Draw label with circled number at bottom of box
        const labelText = getCircledNumber(index + 1)
        ctx.font = `bold ${fontSize}px sans-serif`
        const textMetrics = ctx.measureText(labelText)
        const labelHeight = fontSize + labelPadding * 2
        // Draw label below the box
        const labelY = y + height + 2

        // Draw label background below the box
        ctx.fillStyle = strokeColor
        ctx.fillRect(x, labelY, textMetrics.width + labelPadding * 2, labelHeight)

        // Draw label text (centered vertically in label background)
        ctx.fillStyle = "#ffffff"
        ctx.textBaseline = "middle"
        ctx.fillText(labelText, x + labelPadding, labelY + labelHeight / 2)
      })
    }
    img.src = previewUrl
  }, [result, previewUrl])

  // Compress image by reducing quality (keep dimensions for accurate coordinates)
  async function compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const compressedFile = new File([blob], file.name, { type: "image/jpeg" })
                resolve(compressedFile)
              } else {
                resolve(file)
              }
            },
            "image/jpeg",
            quality
          )
        } else {
          resolve(file)
        }
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Cancel any in-progress API call
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      // Get the actual pixel dimensions of the original image (no compression)
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.src = URL.createObjectURL(file)
      })
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setImageDimensions(dimensions)
      setResult(null)
      setError(null)
    }
  }

  async function handleSubmit() {
    if (!selectedFile) {
      setError("画像ファイルを���択してください")
      return
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsLoading(true)
    setError(null)
    setResult(null)
    setElapsedTime(null)

    const startTime = performance.now()

    try {
      const formData = new FormData()
      formData.append("store_id", storeId)
      formData.append("shelf_id", shelfId)
      formData.append("image", selectedFile)
      
      const response = await authFetch("/api/analyze_shelf1", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      })

      const responseText = await response.text()
      
      const endTime = performance.now()
      setElapsedTime(Math.round((endTime - startTime) / 10) / 100)
      
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
      // Ignore abort errors (user changed image during analysis)
      if (err instanceof Error && err.name === "AbortError") {
        return
      }
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
              <CardTitle className="flex items-center justify-between">
                <span>分析結果</span>
                {elapsedTime !== null && (
                  <span className="text-sm font-normal text-muted-foreground">
                    API処理時間: {elapsedTime.toFixed(2)}秒
                  </span>
                )}
              </CardTitle>
              <CardDescription>検出された空きスペース（欠品箇所）</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-red-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {result.analysis_result.items.filter(i => i.status === "OOS").length}
                      </p>
                      <p className="text-xs text-muted-foreground">欠品（OOS）</p>
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {result.analysis_result.items.filter(i => i.status === "LOW_STOCK").length}
                      </p>
                      <p className="text-xs text-muted-foreground">補充推奨（LOW_STOCK）</p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {sortItems(result.analysis_result.items)
                      .map((item, index) => {
                      const isOOS = item.status === "OOS"
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg min-w-[1.5rem]">{getCircledNumber(index + 1)}</span>
                            <div className={`h-3 w-3 rounded-full ${isOOS ? "bg-red-500" : "bg-yellow-500"}`} />
                            <div>
                              <p className="font-medium">
                                {item.product_name || "不明な商品"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.location ? `${item.location.row}段目 ${item.location.position}` : ""}
                                {item.estimated_replenishment_qty ? ` · 補充推奨: ${item.estimated_replenishment_qty}個` : ""}
                                {item.front_face_gap ? ` · (${item.front_face_gap.x_min.toFixed(2)},${item.front_face_gap.y_min.toFixed(2)})-(${item.front_face_gap.x_max.toFixed(2)},${item.front_face_gap.y_max.toFixed(2)})` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isOOS ? "destructive" : "secondary"}>
                              {isOOS ? "欠品" : "補充推奨"}
                            </Badge>
                            {item.priority && (
                              <Badge variant={item.priority === "High" ? "destructive" : item.priority === "Medium" ? "secondary" : "outline"}>
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
                <canvas ref={canvasRef} className="max-w-full" style={{ display: 'block' }} />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
