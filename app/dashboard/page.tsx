"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  LogOut, 
  Bot, 
  MessageSquare, 
  FileSearch, 
  Calculator,
  Settings,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

interface DemoApp {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

const DEMO_APPS: DemoApp[] = [
  {
    id: "business-ai",
    title: "業務支援AI",
    description: "休暇申請、日報作成、議事録作成などの業務をAIがサポートします",
    icon: <Bot className="h-6 w-6" />,
    href: "/portal",
    color: "bg-primary/10 text-primary",
  },
  {
    id: "chat-ai",
    title: "チャットAI",
    description: "自由な質問に回答する汎用チャットボットです",
    icon: <MessageSquare className="h-6 w-6" />,
    href: "/demo/chat",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "document-ai",
    title: "ドキュメント検索AI",
    description: "社内ドキュメントを検索・要約するAIアシスタントです",
    icon: <FileSearch className="h-6 w-6" />,
    href: "/demo/document",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    id: "analysis-ai",
    title: "データ分析AI",
    description: "データを分析してインサイトを提供するAIエージェントです",
    icon: <Calculator className="h-6 w-6" />,
    href: "/demo/analysis",
    color: "bg-sky-500/10 text-sky-600",
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const { session, sessionLoading, logout } = useAuth()

  useEffect(() => {
    if (sessionLoading) return
    // Check if token exists in sessionStorage as a fallback
    const hasToken = typeof window !== "undefined" && sessionStorage.getItem("auth_token")
    if (!session?.authenticated && !hasToken) {
      router.push("/")
    }
  }, [session, sessionLoading, router])

  async function handleLogout() {
    await logout()
    router.push("/")
  }

  // Show loading while checking auth
  const hasToken = typeof window !== "undefined" && sessionStorage.getItem("auth_token")
  if (sessionLoading || (!session?.authenticated && hasToken)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If no session and no token, the useEffect will redirect
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AIエージェント デモポータル</h1>
              <p className="text-sm text-muted-foreground">ようこそ、{session.username} さん</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session.isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
              >
                <Settings className="mr-2 h-4 w-4" />
                管理画面
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">デモアプリ一覧</h2>
          <p className="mt-2 text-muted-foreground">
            利用したいAIエージェントを選択してください
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {DEMO_APPS.map((app) => (
            <Card
              key={app.id}
              className="group cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => router.push(app.href)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${app.color}`}>
                    {app.icon}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {app.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {app.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  アプリを開く
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
