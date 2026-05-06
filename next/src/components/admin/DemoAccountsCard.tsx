'use client'

import { useState } from 'react'
import { Copy, Check, KeyRound, Eye, EyeOff } from 'lucide-react'

interface Account {
  email: string
  password: string | null // null = no shared password (uses recovery link)
  role: 'admin' | 'nutritionist' | 'user'
  tier: 'free' | 'basic' | 'premium' | 'vip' | '—'
  note?: string
}

const ACCOUNTS: Account[] = [
  {
    email: 'greenofig@gmail.com',
    password: null,
    role: 'admin',
    tier: '—',
    note: 'Reset link sent — set your own password',
  },
  {
    email: 'rawanothman21@gmail.com',
    password: null,
    role: 'nutritionist',
    tier: '—',
    note: 'Reset link sent — set your own password',
  },
  {
    email: 'demo.free@greenofig.com',
    password: 'GreenDemo2025!',
    role: 'user',
    tier: 'free',
  },
  {
    email: 'demo.basic@greenofig.com',
    password: 'GreenDemo2025!',
    role: 'user',
    tier: 'basic',
  },
  {
    email: 'demo.premium@greenofig.com',
    password: 'GreenDemo2025!',
    role: 'user',
    tier: 'premium',
  },
  {
    email: 'demo.vip@greenofig.com',
    password: 'GreenDemo2025!',
    role: 'user',
    tier: 'vip',
  },
]

const TIER_TINT: Record<string, string> = {
  free: '#9baf9f',
  basic: '#06b6d4',
  premium: '#a3e635',
  vip: '#a855f7',
  '—': '#5c7262',
}

const ROLE_TINT: Record<Account['role'], string> = {
  admin: '#f43f5e',
  nutritionist: '#a3e635',
  user: '#9baf9f',
}

export function DemoAccountsCard() {
  const [copied, setCopied] = useState<string | null>(null)
  const [shown, setShown] = useState<Record<string, boolean>>({})

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // Clipboard API rejected — silently no-op so the dashboard never crashes.
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-lime-400" strokeWidth={2} />
        <h2 className="text-base font-semibold text-fg-1">Demo & Staff Accounts</h2>
        <span className="ms-auto text-[11px] text-fg-3 font-mono">
          Use these for testing. Passwords visible to admins only.
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-eyebrow text-fg-3">
              <th className="text-start font-semibold px-5 py-3">Email</th>
              <th className="text-start font-semibold px-3 py-3">Role</th>
              <th className="text-start font-semibold px-3 py-3">Tier</th>
              <th className="text-start font-semibold px-3 py-3">Password</th>
              <th className="text-end font-semibold px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ACCOUNTS.map((a) => {
              const showPwd = shown[a.email] ?? false
              const passwordKey = `${a.email}:pwd`
              const emailKey = `${a.email}:email`
              return (
                <tr key={a.email} className="hover:bg-surface-raised transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-fg-1" dir="ltr">
                    {a.email}
                    {a.note && (
                      <p className="mt-0.5 text-[10px] text-fg-3 font-sans">{a.note}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                      style={{ background: `${ROLE_TINT[a.role]}1a`, color: ROLE_TINT[a.role] }}
                    >
                      {a.role}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                      style={{
                        background: `${TIER_TINT[a.tier]}1a`,
                        color: TIER_TINT[a.tier],
                      }}
                    >
                      {a.tier}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {a.password ? (
                      <div className="inline-flex items-center gap-2">
                        <code className="font-mono text-xs text-fg-1">
                          {showPwd ? a.password : '•'.repeat(a.password.length)}
                        </code>
                        <button
                          type="button"
                          onClick={() =>
                            setShown((s) => ({ ...s, [a.email]: !s[a.email] }))
                          }
                          className="text-fg-3 hover:text-lime-400 transition-colors"
                          aria-label={showPwd ? 'Hide password' : 'Show password'}
                        >
                          {showPwd ? (
                            <EyeOff className="w-3.5 h-3.5" strokeWidth={2} />
                          ) : (
                            <Eye className="w-3.5 h-3.5" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-fg-3 italic">recovery link</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-end">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copy(emailKey, a.email)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-fg-2 hover:bg-bg-deeper hover:text-lime-400 transition-colors"
                      >
                        {copied === emailKey ? (
                          <Check className="w-3 h-3" strokeWidth={2.5} />
                        ) : (
                          <Copy className="w-3 h-3" strokeWidth={2} />
                        )}
                        Email
                      </button>
                      {a.password && (
                        <button
                          type="button"
                          onClick={() => copy(passwordKey, a.password!)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-fg-2 hover:bg-bg-deeper hover:text-lime-400 transition-colors"
                        >
                          {copied === passwordKey ? (
                            <Check className="w-3 h-3" strokeWidth={2.5} />
                          ) : (
                            <Copy className="w-3 h-3" strokeWidth={2} />
                          )}
                          Password
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </article>
  )
}
