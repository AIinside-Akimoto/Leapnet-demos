"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react"

interface SessionData {
  authenticated: boolean
  isAdmin: boolean
  username: string
}

interface AuthContextValue {
  token: string | null
  session: SessionData | null
  sessionLoading: boolean
  login: (token: string) => Promise<boolean>
  logout: () => Promise<void>
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const currentToken = sessionStorage.getItem("auth_token")
      const headers = new Headers(options.headers)
      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`)
      }
      return fetch(url, { ...options, headers })
    },
    []
  )

  const checkSession = useCallback(async (t: string): Promise<boolean> => {
    console.log("[v0] checkSession called")
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      })
      console.log("[v0] checkSession response:", res.status)
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] checkSession success:", data.username)
        setSession(data)
        return true
      } else {
        console.log("[v0] checkSession failed - clearing token")
        sessionStorage.removeItem("auth_token")
        setToken(null)
        setSession(null)
        return false
      }
    } catch (err) {
      console.log("[v0] checkSession error:", err)
      sessionStorage.removeItem("auth_token")
      setToken(null)
      setSession(null)
      return false
    } finally {
      setSessionLoading(false)
    }
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem("auth_token")
    console.log("[v0] AuthProvider init - stored token:", !!stored)
    if (stored) {
      setToken(stored)
      checkSession(stored)
    } else {
      setSessionLoading(false)
    }
  }, [checkSession])

  const login = useCallback(
    async (newToken: string): Promise<boolean> => {
      sessionStorage.setItem("auth_token", newToken)
      setToken(newToken)
      return await checkSession(newToken)
    },
    [checkSession]
  )

  const logout = useCallback(async () => {
    const currentToken = sessionStorage.getItem("auth_token")
    if (currentToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      })
    }
    sessionStorage.removeItem("auth_token")
    setToken(null)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, session, sessionLoading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
