"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send, ClipboardList, FileOutput, Menu, X } from "lucide-react"
import { type AgentKey, AGENTS } from "@/lib/agents"
import { PortalSidebar } from "@/components/portal-sidebar"
import { AgentForm } from "@/components/agent-form"
import { AgentResult } from "@/components/agent-result"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

export default function PortalPage() {
  const router = useRouter()
  const { session, sessionLoading, logout, authFetch } = useAuth()

  const [selectedKey, setSelectedKey] = useState<AgentKey>("leave_manager")
  const [params, setParams] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ answer: string; prompt: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Only redirect if we're done loading AND not authenticated
    if (!sessionLoading && !session?.authenticated) {
      window.location.href = "/"
    }
  }, [session, sessionLoading])

  const handleParamsChange = useCallback((newParams: Record<string, string>) => {
    setParams(newParams)
  }, [])

  function handleAgentSelect(key: AgentKey) {
    setSelectedKey(key)
    setResult(null)
    setSidebarOpen(false)
  }

  async function handleSubmit() {
    setLoading(true)
    setResult(null)

    try {
      const res = await authFetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey: selectedKey, params }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "エラーが発生しました")
        return
      }

      setResult({ answer: data.answer, prompt: data.prompt })
    } catch {
      toast.error("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    window.location.href = "/"
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

  const agent = AGENTS[selectedKey]

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <PortalSidebar
          selectedKey={selectedKey}
          onSelect={handleAgentSelect}
          username={session.username}
          isAdmin={session.isAdmin}
          onLogout={handleLogout}
          onAdminClick={session.isAdmin ? () => window.location.href = "/admin" : undefined}
          onDashboardClick={() => window.location.href = "/dashboard"}
        />
      </div>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="メニューを開く"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-card-foreground">{agent.title}</h1>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-2">
            {/* Left: Input form */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">情報入力</h2>
              </div>
              <AgentForm agentKey={selectedKey} onParamsChange={handleParamsChange} />
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {agent.loadingMsg}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    エージェントに依頼
                  </>
                )}
              </Button>
            </section>

            {/* Right: Result */}
            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <FileOutput className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-card-foreground">業務成果 / ドラフト</h2>
              </div>
              {result ? (
                <AgentResult answer={result.answer} prompt={result.prompt} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <FileOutput className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    左側のフォームを入力して実行してください
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
