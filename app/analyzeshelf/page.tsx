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

interface BoundingBox {
  x_min: number
  y_min: number
  x_max: number
  y_max: number
}

interface AnalysisItem {
  product_name: string | null
  status: "OOS" | "LOW_STOCK"
  location: {
    row: number
    position: string
  }
  estimated_replenishment_qty: number
  priority: "High" | "Medium" | "Low"
  confidence: number
  bounding_box: BoundingBox
  empty_space_box: BoundingBox | null
  price_tag_box: BoundingBox | null
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
    if (result && previewUrl && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        imageRef.current = img
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw the image
        ctx.drawImage(img, 0, 0)
        
        // Draw bounding boxes for each item
        result.analysis_result.items.forEach((item) => {
          const box = item.bounding_box
          const x = box.x_min * img.width
          const y = box.y_min * img.height
          const width = (box.x_max - box.x_min) * img.width
          const height = (box.y_max - box.y_min) * img.height

          // Set color based on priority
          let strokeColor: string
          let fillColor: string
          switch (item.priority) {
            case "High":
              strokeColor = "#ef4444" // red-500
              fillColor = "rgba(239, 68, 68, 0.2)"
              break
            case "Medium":
              strokeColor = "#eab308" // yellow-500
              fillColor = "rgba(234, 179, 8, 0.2)"
              break
            case "Low":
              strokeColor = "#22c55e" // green-500
              fillColor = "rgba(34, 197, 94, 0.2)"
              break
            default:
              strokeColor = "#6b7280"
              fillColor = "rgba(107, 114, 128, 0.2)"
          }

          // Draw filled rectangle
          ctx.fillStyle = fillColor
          ctx.fillRect(x, y, width, height)

          // Draw border
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = 3
          ctx.strokeRect(x, y, width, height)

          // Draw label background
          const labelText = item.product_name || "不明"
          ctx.font = "bold 14px sans-serif"
          const textMetrics = ctx.measureText(labelText)
          const labelHeight = 20
          const labelPadding = 4

          ctx.fillStyle = strokeColor
          ctx.fillRect(x, y - labelHeight - 2, textMetrics.width + labelPadding * 2, labelHeight)

          // Draw label text
          ctx.fillStyle = "#ffffff"
          ctx.fillText(labelText, x + labelPadding, y - 6)
        })
      }
      img.src = previewUrl
    }
  }, [result, previewUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
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
      const formData = new FormData()
      formData.append("store_id", storeId)
      formData.append("shelf_id", shelfId)
      formData.append("timestamp", new Date().toISOString())
      formData.append("image", selectedFile)
      
      const response = await authFetch("/api/analyzeshelf", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "分析に失敗しました")
      }

      setResult(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "分析中にエラーが発生しました"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "High":
        return "bg-red-500"
      case "Medium":
        return "bg-yellow-500"
      case "Low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "OOS":
        return "欠品"
      case "LOW_STOCK":
        return "補充推奨"
      default:
        return status
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
              <CardDescription>検出された欠品・補充推奨商品</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-red-500/10 p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {result.analysis_result.summary.total_oos_items}
                      </p>
                      <p className="text-sm text-muted-foreground">欠品</p>
                    </div>
                    <div className="rounded-lg bg-yellow-500/10 p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {result.analysis_result.summary.total_replenish_items}
                      </p>
                      <p className="text-sm text-muted-foreground">補充推奨</p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    {result.analysis_result.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${getPriorityColor(item.priority)}`} />
                          <div>
                            <p className="font-medium">
                              {item.product_name || "商品名不明"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.location.row}段目・{item.location.position}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.status === "OOS" ? "destructive" : "secondary"}>
                            {getStatusLabel(item.status)}
                          </Badge>
                          <div className="text-right">
                            <p className="text-sm font-medium">+{item.estimated_replenishment_qty}</p>
                            <p className="text-xs text-muted-foreground">
                              {Math.round(item.confidence * 100)}%
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
                画像上に検出された商品の位置を表示しています。
                <span className="ml-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-red-500 mr-1" />High
                  <span className="inline-block h-3 w-3 rounded-full bg-yellow-500 mx-1 ml-3" />Medium
                  <span className="inline-block h-3 w-3 rounded-full bg-green-500 mx-1 ml-3" />Low
                </span>
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
