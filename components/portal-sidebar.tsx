"use client"

import { Building2, CalendarDays, Coins, Handshake, UserPlus, Gift, LogOut, Shield, ChevronRight } from "lucide-react"
import { type AgentKey, AGENTS, AGENT_KEYS } from "@/lib/agents"
import { cn } from "@/lib/utils"

const ICON_MAP: Record<string, React.ElementType> = {
  CalendarDays,
  Coins,
  Handshake,
  UserPlus,
  Gift,
  LogOut,
}

interface PortalSidebarProps {
  selectedKey: AgentKey
  onSelect: (key: AgentKey) => void
  username: string
  isAdmin: boolean
  onLogout: () => void
  onAdminClick?: () => void
}

export function PortalSidebar({
  selectedKey,
  onSelect,
  username,
  isAdmin,
  onLogout,
  onAdminClick,
}: PortalSidebarProps) {
  return (
    <aside className="flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-tight">業務メニュー</h2>
          <p className="text-xs text-sidebar-foreground/60">{username}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
          エージェント一覧
        </p>
        <ul className="space-y-1">
          {AGENT_KEYS.map((key) => {
            const agent = AGENTS[key]
            const Icon = ICON_MAP[agent.icon] || CalendarDays
            const isActive = selectedKey === key
            return (
              <li key={key}>
                <button
                  onClick={() => onSelect(key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{agent.title}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        {isAdmin && onAdminClick && (
          <button
            onClick={onAdminClick}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span>管理パネル</span>
          </button>
        )}
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>ログアウト</span>
        </button>
      </div>

      <div className="px-5 py-3 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40">
          Provided by 株式会社サンプル
        </p>
      </div>
    </aside>
  )
}
