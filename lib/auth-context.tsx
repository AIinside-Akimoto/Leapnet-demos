"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

interface SessionData {
  authenticated: boolean
  isAdmin: boolean
  username: string
  userId: number
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

// Use localStorage instead of sessionStorage for more reliable persistence
const TOKEN_KEY = "auth_token"

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

function setStoredToken(token: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TOKEN_KEY, token)
}

function removeStoredToken(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const currentToken = getStoredToken()
      
      // For FormData, don't use Headers object as it can interfere with Content-Type
      if (options.body instanceof FormData) {
        const headers: Record<string, string> = {}
        if (currentToken) {
          headers["Authorization"] = `Bearer ${currentToken}`
        }
        return fetch(url, { ...options, headers })
      }
      
      // For other requests, use Headers object
      const headers = new Headers(options.headers)
      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`)
      }
      return fetch(url, { ...options, headers })
    },
    []
  )

  // Initialize auth state on mount
  useEffect(() => {
    let cancelled = false

    async function initAuth() {
      const storedToken = getStoredToken()
      
      if (!storedToken) {
        setSessionLoading(false)
        return
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        
        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          setToken(storedToken)
          setSession(data)
        } else {
          // Invalid token, clear it
          removeStoredToken()
          setToken(null)
          setSession(null)
        }
      } catch {
        if (cancelled) return
        removeStoredToken()
        setToken(null)
        setSession(null)
      } finally {
        if (!cancelled) {
          setSessionLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (newToken: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${newToken}` },
      })
      
      if (res.ok) {
        const data = await res.json()
        setStoredToken(newToken)
        setToken(newToken)
        setSession(data)
        return true
      } else {
        return false
      }
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    const currentToken = getStoredToken()
    if (currentToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        })
      } catch {
        // Ignore logout errors
      }
    }
    removeStoredToken()
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
