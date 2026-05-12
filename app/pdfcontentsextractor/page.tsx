"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"

interface ExtractedPage {
  page_number: number
  content: string
}

interface ExtractionResult {
  extracted_pages: ExtractedPage[]
}

interface ChunkResult {
  chunkIndex: number
  startPage: number
  endPage: number
  pages: ExtractedPage[]
  status: "pending" | "processing" | "completed" | "error"
  error?: string
}

export default function PdfContentsExtractorPage() {
  const router = useRouter()
  const { token, session, sessionLoading, authFetch } = useAuth()
  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pagesPerChunk, setPagesPerChunk] = useState(2)
  const [concurrency, setConcurrency] = useState(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chunkResults, setChunkResults] = useState<ChunkResult[]>([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!sessionLoading && !session?.authenticated) {
      router.push("/")
    }
  }, [session, sessionLoading, router])

  // PDFのページ数を取得する（pdf-libを使用）
  async function getPdfPageCount(file: File): Promise<number> {
    const { PDFDocument } = await import("pdf-lib")
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    return pdfDoc.getPageCount()
  }

  // PDFを指定ページで分割する
  async function splitPdf(file: File, startPage: number, endPage: number): Promise<Blob> {
    const { PDFDocument } = await import("pdf-lib")
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    
    const newPdfDoc = await PDFDocument.create()
    const pageIndices = Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage - 1 + i
    )
    const copiedPages = await newPdfDoc.copyPages(pdfDoc, pageIndices)
    copiedPages.forEach((page) => newPdfDoc.addPage(page))
    
    const pdfBytes = await newPdfDoc.save()
    return new Blob([pdfBytes], { type: "application/pdf" })
  }

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
      setChunkResults([])
      setProgress(0)
      
      try {
        const pageCount = await getPdfPageCount(file)
        setTotalPages(pageCount)
      } catch {
        setError("PDFファイルの読み込みに失敗しました")
        setTotalPages(null)
      }
    }
  }

  async function processChunk(
    file: File,
    chunkIndex: number,
    startPage: number,
    endPage: number,
    signal: AbortSignal
  ): Promise<ChunkResult> {
    try {
      // Split PDF for this chunk
      const chunkPdf = await splitPdf(file, startPage, endPage)
      const chunkFile = new File([chunkPdf], `chunk_${startPage}-${endPage}.pdf`, {
        type: "application/pdf",
      })

      const formData = new FormData()
      formData.append("file", chunkFile)

      const response = await authFetch("/api/pdf_extract", {
        method: "POST",
        body: formData,
        signal,
      })

      const responseText = await response.text()

      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} - ${responseText}`)
      }

      let data: ExtractionResult
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(`JSONパースエラー: ${responseText.substring(0, 200)}`)
      }
      
      // Adjust page numbers to reflect original PDF pages
      const adjustedPages = data.extracted_pages.map((page) => ({
        ...page,
        page_number: startPage + page.page_number - 1,
      }))

      return {
        chunkIndex,
        startPage,
        endPage,
        pages: adjustedPages,
        status: "completed",
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err
      }
      return {
        chunkIndex,
        startPage,
        endPage,
        pages: [],
        status: "error",
        error: err instanceof Error ? err.message : "処理中にエラーが発生しました",
      }
    }
  }

  async function handleSubmit() {
    if (!selectedFile || !totalPages) {
      setError("PDFファイルを選択してください")
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
    setProgress(0)

    try {
      // Calculate chunks
      const chunks: { startPage: number; endPage: number }[] = []
      for (let i = 0; i < totalPages; i += pagesPerChunk) {
        chunks.push({
          startPage: i + 1,
          endPage: Math.min(i + pagesPerChunk, totalPages),
        })
      }

      // Initialize chunk results
      const initialResults: ChunkResult[] = chunks.map((chunk, index) => ({
        chunkIndex: index,
        startPage: chunk.startPage,
        endPage: chunk.endPage,
        pages: [],
        status: "pending",
      }))
      setChunkResults(initialResults)

      // Process chunks with concurrency limit
      const results: ChunkResult[] = [...initialResults]
      let completedCount = 0

      // Process in batches based on concurrency
      for (let i = 0; i < chunks.length; i += concurrency) {
        if (abortController.signal.aborted) break

        const batch = chunks.slice(i, i + concurrency)
        const batchPromises = batch.map((chunk, batchIndex) => {
          const chunkIndex = i + batchIndex
          
          // Update status to processing
          setChunkResults((prev) =>
            prev.map((r) =>
              r.chunkIndex === chunkIndex ? { ...r, status: "processing" } : r
            )
          )

          return processChunk(
            selectedFile,
            chunkIndex,
            chunk.startPage,
            chunk.endPage,
            abortController.signal
          )
        })

        const batchResults = await Promise.all(batchPromises)

        for (const result of batchResults) {
          results[result.chunkIndex] = result
          completedCount++
          setProgress((completedCount / chunks.length) * 100)
          setChunkResults((prev) =>
            prev.map((r) => (r.chunkIndex === result.chunkIndex ? result : r))
          )
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return
      }
      setError(err instanceof Error ? err.message : "処理中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  // Combine all extracted pages sorted by page number
  const allExtractedPages = chunkResults
    .filter((r) => r.status === "completed")
    .flatMap((r) => r.pages)
    .sort((a, b) => a.page_number - b.page_number)

  const completedChunks = chunkResults.filter((r) => r.status === "completed").length
  const errorChunks = chunkResults.filter((r) => r.status === "error").length
  const processingChunks = chunkResults.filter((r) => r.status === "processing").length

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
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">PDFテキスト抽出</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-6">
          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
              <CardDescription>
                PDFファイルを分割して処理するための設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pagesPerChunk">分割ページ数</Label>
                  <Input
                    id="pagesPerChunk"
                    type="number"
                    min={1}
                    max={100}
                    value={pagesPerChunk}
                    onChange={(e) => setPagesPerChunk(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <p className="text-xs text-muted-foreground">
                    PDFをこのページ数ごとに分割して処理します
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="concurrency">同時実行数</Label>
                  <Input
                    id="concurrency"
                    type="number"
                    min={1}
                    max={2}
                    value={concurrency}
                    onChange={(e) => setConcurrency(Math.max(1, Math.min(2, parseInt(e.target.value) || 1)))}
                  />
                  <p className="text-xs text-muted-foreground">
                    同時に処理するチャンク数（1-2）
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle>PDFファイル</CardTitle>
              <CardDescription>
                テキストを抽出するPDFファイルをアップロードしてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-primary/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-primary" />
                    <p className="mt-2 font-medium">{selectedFile.name}</p>
                    {totalPages && (
                      <p className="text-sm text-muted-foreground">
                        {totalPages} ページ ({Math.ceil(totalPages / pagesPerChunk)} チャンク)
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      クリックして別のファイルを選択
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">
                      クリックしてPDFファイルを選択
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!selectedFile || !totalPages || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  "テキスト抽出を開始"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Progress Card */}
          {chunkResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>処理状況</CardTitle>
                <CardDescription>
                  {completedChunks}/{chunkResults.length} チャンク完了
                  {processingChunks > 0 && ` (${processingChunks} 処理中)`}
                  {errorChunks > 0 && ` (${errorChunks} エラー)`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} className="h-2" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {chunkResults.map((chunk) => (
                    <div
                      key={chunk.chunkIndex}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${
                        chunk.status === "completed"
                          ? "border-green-500/50 bg-green-500/10"
                          : chunk.status === "processing"
                            ? "border-blue-500/50 bg-blue-500/10"
                            : chunk.status === "error"
                              ? "border-red-500/50 bg-red-500/10"
                              : "border-muted"
                      }`}
                    >
                      {chunk.status === "completed" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {chunk.status === "processing" && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      )}
                      {chunk.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {chunk.status === "pending" && (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/25" />
                      )}
                      <span>
                        P{chunk.startPage}-{chunk.endPage}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Card */}
          {allExtractedPages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>抽出結果</CardTitle>
                <CardDescription>
                  {allExtractedPages.length} ページ分のテキストを抽出しました
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allExtractedPages.map((page) => (
                  <div key={page.page_number} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-primary">
                        ページ {page.page_number}
                      </span>
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                        {page.content}
                      </pre>
                    </div>
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
