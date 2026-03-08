"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Plus,
  Trash2,
  CalendarClock,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  Users,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

interface AppUser {
  id: number
  username: string
  expires_at: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const { session, sessionLoading, authFetch } = useAuth()

  const [users, setUsers] = useState<AppUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [creating, setCreating] = useState(false)
  const [createdUser, setCreatedUser] = useState<{
    username: string
    password: string
    expiresAt: string
  } | null>(null)
  const [copiedPassword, setCopiedPassword] = useState(false)

  const [extendOpen, setExtendOpen] = useState(false)
  const [extendUserId, setExtendUserId] = useState<number | null>(null)
  const [extendDays, setExtendDays] = useState(30)
  const [extending, setExtending] = useState(false)

  useEffect(() => {
    if (sessionLoading) return
    const hasToken = sessionStorage.getItem("auth_token")
    if ((!session?.authenticated || !session?.isAdmin) && !hasToken) {
      router.push("/")
    }
  }, [session, sessionLoading, router])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch {
      // ignore
    } finally {
      setUsersLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    if (session?.isAdmin) {
      fetchUsers()
    }
  }, [session, fetchUsers])

  async function handleCreateUser() {
    if (!newUsername.trim()) {
      toast.error("ユーザー名を入力してください")
      return
    }
    setCreating(true)
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), expiresInDays }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error)
        return
      }
      setCreatedUser({
        username: data.username,
        password: data.password,
        expiresAt: data.expiresAt,
      })
      setNewUsername("")
      setExpiresInDays(30)
      fetchUsers()
    } catch {
      toast.error("通信エラーが発生しました")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteUser(userId: number) {
    try {
      const res = await authFetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        toast.error("削除に失敗しました")
        return
      }
      toast.success("ユーザーを削除しました")
      fetchUsers()
    } catch {
      toast.error("通信エラーが発生しました")
    }
  }

  async function handleExtend() {
    if (extendUserId === null) return
    setExtending(true)
    try {
      const res = await authFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: extendUserId, expiresInDays: extendDays }),
      })
      if (!res.ok) {
        toast.error("更新に失敗しました")
        return
      }
      toast.success("有効期限を更新しました")
      setExtendOpen(false)
      fetchUsers()
    } catch {
      toast.error("通信エラーが発生しました")
    } finally {
      setExtending(false)
    }
  }

  async function copyPassword() {
    if (!createdUser) return
    await navigator.clipboard.writeText(createdUser.password)
    setCopiedPassword(true)
    toast.success("パスワードをコピーしました")
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date()
  }

  if (sessionLoading || !session?.isAdmin) {
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
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/portal")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            ポータルに戻る
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-card-foreground">管理パネル</h1>
              <p className="text-xs text-muted-foreground">ユーザー管理</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">{users.length}</p>
                <p className="text-xs text-muted-foreground">総ユーザー数</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                <Check className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {users.filter((u) => !isExpired(u.expires_at)).length}
                </p>
                <p className="text-xs text-muted-foreground">有効ユーザー数</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {users.filter((u) => isExpired(u.expires_at)).length}
                </p>
                <p className="text-xs text-muted-foreground">期限切れ</p>
              </div>
            </div>
          </div>
        </div>

        {/* User list */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-card-foreground">ユーザー一覧</h2>
            <Dialog
              open={createOpen || !!createdUser}
              onOpenChange={(open) => {
                if (!open) {
                  setCreateOpen(false)
                  setCreatedUser(null)
                  setCopiedPassword(false)
                } else {
                  setCreateOpen(true)
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  ユーザー作成
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                {createdUser ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>ユーザー作成完了</DialogTitle>
                      <DialogDescription>
                        以下の情報をユーザーに伝えてください。パスワードは再表示できません。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">ユーザー名</p>
                          <p className="mt-1 text-sm font-semibold text-card-foreground">
                            {createdUser.username}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">パスワード</p>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="flex-1 rounded bg-card px-3 py-2 text-sm font-mono text-card-foreground border border-border">
                              {createdUser.password}
                            </code>
                            <Button variant="outline" size="sm" onClick={copyPassword}>
                              {copiedPassword ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">有効期限</p>
                          <p className="mt-1 text-sm text-card-foreground">
                            {formatDate(createdUser.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setCreatedUser(null)
                          setCreateOpen(false)
                          setCopiedPassword(false)
                        }}
                      >
                        閉じる
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle>新規ユーザー作成</DialogTitle>
                      <DialogDescription>
                        パスワードは自動生成されます。有効期限はデフォルト30日です。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-username">ユーザー名</Label>
                        <Input
                          id="new-username"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="例: tanaka.taro"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expires-days">有効期限（日数）</Label>
                        <Input
                          id="expires-days"
                          type="number"
                          min={1}
                          max={365}
                          value={expiresInDays}
                          onChange={(e) => setExpiresInDays(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                          今日から{expiresInDays}日後（
                          {formatDate(
                            new Date(
                              Date.now() + expiresInDays * 24 * 60 * 60 * 1000
                            ).toISOString()
                          )}
                          ）まで有効
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateUser}
                        disabled={creating || !newUsername.trim()}
                      >
                        {creating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            作成中...
                          </>
                        ) : (
                          "ユーザーを作成"
                        )}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">まだユーザーが作成されていません</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー名</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.expires_at)}
                    </TableCell>
                    <TableCell>
                      {isExpired(user.expires_at) ? (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          期限切れ
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-chart-2/10 px-2.5 py-0.5 text-xs font-medium text-chart-2">
                          有効
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            setExtendUserId(user.id)
                            setExtendDays(30)
                            setExtendOpen(true)
                          }}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          期限更新
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              削除
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ユーザーを削除しますか？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.username}{" "}
                                を削除します。この操作は取り消せません。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                削除する
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Extend expiry dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>有効期限の更新</DialogTitle>
            <DialogDescription>
              今日から指定日数後に有効期限を設定します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>延長日数</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={extendDays}
                onChange={(e) => setExtendDays(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                新しい有効期限:{" "}
                {formatDate(
                  new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000).toISOString()
                )}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleExtend} disabled={extending}>
              {extending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                "更新する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
