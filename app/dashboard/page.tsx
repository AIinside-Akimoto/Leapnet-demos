"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  LogOut, 
  Bot, 
  FileSearch, 
  Calculator,
  Settings,
  Sparkles,
  FileCode,
  Plus,
  Heart,
  ExternalLink,
  Pencil,
  Trash2,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"

interface AgentEntry {
  id: number
  name: string
  url: string
  comment: string
  likes: number
  created_by: number
  creator_name: string
  created_at: string
  updated_at: string
}

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
    id: "docs-generator",
    title: "AIエージェント設計支援",
    description: "音声文字起こしからAIエージェントの設計図とプロンプトを自動生成します",
    icon: <FileCode className="h-6 w-6" />,
    href: "/docsgenerator",
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    id: "initial-response",
    title: "初動対応アシスタント",
    description: "製造業向けの不具合分析プリセットです",
    icon: <FileSearch className="h-6 w-6" />,
    href: "https://initialresponse.streamlit.app/",
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
  const { session, sessionLoading, logout, authFetch } = useAuth()
  
  // Agent library state
  const [agents, setAgents] = useState<AgentEntry[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentEntry | null>(null)
  const [formData, setFormData] = useState({ name: "", url: "", comment: "" })
  const [formLoading, setFormLoading] = useState(false)

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents")
      if (res.ok) {
        const data = await res.json()
        setAgents(data)
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error)
    } finally {
      setAgentsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only redirect if we're done loading AND not authenticated
    if (!sessionLoading && !session?.authenticated) {
      router.push("/")
    }
  }, [session, sessionLoading, router])

  useEffect(() => {
    if (session?.authenticated) {
      fetchAgents()
    }
  }, [session, fetchAgents])

  async function handleLogout() {
    await logout()
    router.push("/")
  }

  // Agent CRUD handlers
  function openCreateDialog() {
    setEditingAgent(null)
    setFormData({ name: "", url: "", comment: "" })
    setDialogOpen(true)
  }

  function openEditDialog(agent: AgentEntry) {
    setEditingAgent(agent)
    setFormData({ name: agent.name, url: agent.url, comment: agent.comment })
    setDialogOpen(true)
  }

  async function handleSubmitAgent() {
    if (!formData.name || !formData.url) return
    
    setFormLoading(true)
    try {
      if (editingAgent) {
        // Update
        const res = await authFetch(`/api/agents/${editingAgent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          await fetchAgents()
          setDialogOpen(false)
        }
      } else {
        // Create
        const res = await authFetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          await fetchAgents()
          setDialogOpen(false)
        }
      }
    } catch (error) {
      console.error("Failed to save agent:", error)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDeleteAgent(id: number) {
    if (!confirm("このエージェントを削除しますか？")) return
    
    try {
      const res = await authFetch(`/api/agents/${id}`, { method: "DELETE" })
      if (res.ok) {
        await fetchAgents()
      }
    } catch (error) {
      console.error("Failed to delete agent:", error)
    }
  }

  async function handleLike(id: number) {
    try {
      const res = await fetch(`/api/agents/${id}/like`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setAgents(prev => prev.map(a => a.id === id ? { ...a, likes: data.likes } : a))
      }
    } catch (error) {
      console.error("Failed to like agent:", error)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })
  }

  function canEditAgent(agent: AgentEntry) {
    return session?.isAdmin || agent.created_by === session?.userId
  }

  // Show loading while session is being verified
  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // Not authenticated - will redirect via useEffect
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
              onClick={() => {
                if (app.href.startsWith("http")) {
                  window.open(app.href, "_blank")
                } else {
                  router.push(app.href)
                }
              }}
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

        {/* Agent Library Section */}
        <div className="mt-16 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">AIエージェントライブラリ</h2>
              <p className="mt-2 text-muted-foreground">
                ユーザーが登録したAIエージェントの一覧
              </p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              エージェントを登録
            </Button>
          </div>
        </div>

        {agentsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">まだエージェントが登録されていません</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              最初のエージェントを登録
            </Button>
          </Card>
        ) : (
          <div className="grid gap-2">
            {agents.map((agent) => (
              <Card key={agent.id} className="transition-all hover:shadow-md">
                <CardContent className="px-4 py-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
                        <a
                          href={agent.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {agent.comment && (
                          <span className="text-sm text-muted-foreground truncate">- {agent.comment}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>登録者: {agent.creator_name}</span>
                        <span>更新日: {formatDate(agent.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(agent.id)}
                        className="gap-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-2"
                      >
                        <Heart className="h-4 w-4" />
                        <span>{agent.likes}</span>
                      </Button>
                      {canEditAgent(agent) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(agent)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgent ? "エージェントを編集" : "エージェントを登録"}</DialogTitle>
            <DialogDescription>
              AIエージェントの情報を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="エージェントの名前"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment">コメント</Label>
              <Textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="エージェントの説明"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitAgent}
              disabled={formLoading || !formData.name || !formData.url}
            >
              {formLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingAgent ? "更新" : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
