'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search,
  Download,
  ShoppingBag,
  CreditCard,
  Package,
  TrendingUp,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronDown,
  type LucideIcon,
} from '@/icons'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'

type Status = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

interface AdminOrder {
  id: string
  customerName: string
  customerInitials: string
  customerEmail: string
  itemCount: number
  total: number
  status: Status
  placedISO: string
}

const STATUS_META: Record<Status, { Icon: LucideIcon; tint: string }> = {
  pending:    { Icon: Clock,        tint: '#9baf9f' },
  processing: { Icon: Package,      tint: '#06b6d4' },
  shipped:    { Icon: Truck,        tint: '#e8912a' },
  delivered:  { Icon: CheckCircle2, tint: '#a3e635' },
  cancelled:  { Icon: XCircle,      tint: '#f43f5e' },
  refunded:   { Icon: RotateCcw,    tint: '#a855f7' },
}

const FILTERS: ('all' | Status)[] = [
  'all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
]

const SEED: AdminOrder[] = [
  { id: 'GF-10254', customerName: 'Sara Khoury',     customerInitials: 'SK', customerEmail: 'sara@example.com',   itemCount: 3, total: 92,  status: 'pending',    placedISO: '2026-05-03' },
  { id: 'GF-10253', customerName: 'Layla Hijazi',    customerInitials: 'LH', customerEmail: 'layla@example.com',  itemCount: 2, total: 66,  status: 'shipped',    placedISO: '2026-04-29' },
  { id: 'GF-10250', customerName: 'Maya Khalil',     customerInitials: 'MK', customerEmail: 'maya@example.com',   itemCount: 4, total: 124, status: 'processing', placedISO: '2026-04-28' },
  { id: 'GF-10241', customerName: 'Yousef Abu Shaer', customerInitials: 'YA', customerEmail: 'yousef@example.com', itemCount: 1, total: 28,  status: 'delivered',  placedISO: '2026-04-22' },
  { id: 'GF-10239', customerName: 'Diana Costa',     customerInitials: 'DC', customerEmail: 'diana@example.com',  itemCount: 5, total: 152, status: 'delivered',  placedISO: '2026-04-19' },
  { id: 'GF-10231', customerName: 'Omar Saadeh',     customerInitials: 'OS', customerEmail: 'omar@example.com',   itemCount: 2, total: 48,  status: 'cancelled',  placedISO: '2026-04-15' },
  { id: 'GF-10222', customerName: 'Maya Khalil',     customerInitials: 'MK', customerEmail: 'maya@example.com',   itemCount: 1, total: 22,  status: 'refunded',   placedISO: '2026-04-10' },
  { id: 'GF-10213', customerName: 'Rasha Tarawneh',  customerInitials: 'RT', customerEmail: 'rasha@example.com',  itemCount: 3, total: 78,  status: 'delivered',  placedISO: '2026-04-04' },
  { id: 'GF-10199', customerName: 'Layla Hijazi',    customerInitials: 'LH', customerEmail: 'layla@example.com',  itemCount: 4, total: 52,  status: 'delivered',  placedISO: '2026-03-30' },
  { id: 'GF-10184', customerName: 'Karim Jubran',    customerInitials: 'KJ', customerEmail: 'karim@example.com',  itemCount: 2, total: 60,  status: 'delivered',  placedISO: '2026-03-25' },
]

export default function AdminOrdersPage() {
  const t = useTranslations('admin')
  const tO = useTranslations('admin.ordersPage')
  const tStatus = useTranslations('orders')

  const [filter, setFilter] = useState<'all' | Status>('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const live = useSupabaseQuery<AdminOrder[]>(async (supabase) => {
    type LineItem = { qty?: number }
    type OrderRow = {
      id: string
      user_id: string
      total_cents: number | null
      status: Status
      created_at: string
      items: LineItem[] | null
    }
    const { data: orders } = await supabase
      .from('orders')
      .select('id, user_id, total_cents, status, created_at, items')
      .order('created_at', { ascending: false })
      .limit(80)
    const rows = (orders as OrderRow[] | null) ?? []
    if (rows.length === 0) return []

    // Item counts come straight from the orders.items jsonb array.
    const itemCount = new Map<string, number>()
    for (const r of rows) {
      const total = (r.items ?? []).reduce((acc, it) => acc + (it.qty ?? 0), 0)
      itemCount.set(r.id, total)
    }

    // Hydrate customer names
    const customerIds = Array.from(new Set(rows.map((r) => r.user_id)))
    const { data: customers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', customerIds)
    type CustomerRow = { id: string; full_name: string | null }
    const nameOf = new Map(
      ((customers as CustomerRow[] | null) ?? []).map((c) => [c.id, c.full_name ?? 'Customer']),
    )

    return rows.map((r) => {
      const name = nameOf.get(r.user_id) ?? 'Customer'
      return {
        id: r.id,
        customerName: name,
        customerInitials: name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
        customerEmail: '',
        itemCount: itemCount.get(r.id) ?? 0,
        total: (r.total_cents ?? 0) / 100,
        status: r.status,
        placedISO: r.created_at,
      }
    })
  }, [])

  const sourceList = (live.data && live.data.length > 0) ? live.data : SEED

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sourceList.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false
      if (
        q &&
        !o.id.toLowerCase().includes(q) &&
        !o.customerEmail.toLowerCase().includes(q) &&
        !o.customerName.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [sourceList, filter, query])

  const totalRevenue = sourceList.filter(
    (o) => o.status === 'delivered' || o.status === 'shipped' || o.status === 'processing',
  ).reduce((acc, o) => acc + o.total, 0)
  const ordersThisMonth = sourceList.length
  const aov = sourceList.length > 0 ? Math.round(totalRevenue / sourceList.length) : 0
  const fulfillmentRate = sourceList.length > 0 ? Math.round(
    (sourceList.filter((o) => o.status === 'delivered').length / sourceList.length) * 100,
  ) : 0

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('orders')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tO('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const header = 'order_id,customer,items,total_usd,status,placed_at\n'
            const csvCell = (v: unknown): string => {
              const s = v == null ? '' : String(v)
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
            }
            const body = visible
              .map((r) =>
                [r.id, r.customerName, r.itemCount, r.total, r.status, r.placedISO]
                  .map(csvCell)
                  .join(','),
              )
              .join('\n')
            const blob = new Blob([header + body], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `greenofig-orders-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
          {tO('exportCsv')}
        </button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat Icon={CreditCard} tint="#a3e635" label={tO('totalRevenue')}    value={`${totalRevenue} USD`} />
        <Stat Icon={ShoppingBag} tint="#06b6d4" label={tO('ordersThisMonth')} value={ordersThisMonth} />
        <Stat Icon={TrendingUp} tint="#e8912a" label={tO('avgOrderValue')}    value={`${aov} USD`} />
        <Stat Icon={CheckCircle2} tint="#a855f7" label={tO('fulfillment')}     value={`${fulfillmentRate}%`} />
      </section>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tO('search')}
            className="w-full h-11 rounded-pill bg-surface border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-primary/20 text-lime-400 border border-primary/40'
                  : 'bg-surface border border-border text-fg-2 hover:border-primary/40'
              }`}
            >
              {f === 'all' ? tO('filterAll') : tStatus(f)}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <ShoppingBag className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{tO('noOrders')}</p>
          <p className="mt-1 text-sm text-fg-2">{tO('noOrdersBody')}</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {visible.map((o) => (
            <OrderRow
              key={o.id}
              tO={tO}
              tStatus={tStatus}
              order={o}
              expanded={openId === o.id}
              onToggle={() => setOpenId((c) => (c === o.id ? null : o.id))}
              onRefunded={() => live.reload()}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function OrderRow({
  tO,
  tStatus,
  order,
  expanded,
  onToggle,
  onRefunded,
}: {
  tO: ReturnType<typeof useTranslations>
  tStatus: ReturnType<typeof useTranslations>
  order: AdminOrder
  expanded: boolean
  onToggle: () => void
  onRefunded: () => void
}) {
  const [refunding, setRefunding] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const postAction = async (
    path: string,
    body: Record<string, unknown>,
    setBusy: (v: boolean) => void,
    onSuccess: () => void,
  ) => {
    setBusy(true)
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string | { message?: string }
      }
      if (res.ok && data.ok) {
        onSuccess()
      } else {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ?? `Action failed (${res.status})`
        alert(msg)
      }
    } catch {
      alert('Network error.')
    } finally {
      setBusy(false)
    }
  }

  // Refund flow: prompt for an optional amount. Empty/blank → full
  // refund. Numeric value → partial refund of that USD amount.
  const refund = () => {
    const totalDollars = order.total.toFixed(2)
    const input = window.prompt(
      `Refund order ${order.id}\n\nFull total: $${totalDollars}\n\nLeave empty for a FULL refund. Enter a USD amount (e.g. 12.50) for a PARTIAL refund:`,
      '',
    )
    if (input === null) return // cancelled

    const trimmed = input.trim()
    let amountCents: number | undefined
    if (trimmed.length > 0) {
      const dollars = Number(trimmed)
      if (!Number.isFinite(dollars) || dollars <= 0) {
        alert('Refund amount must be a positive number.')
        return
      }
      if (dollars > order.total) {
        alert(`Refund amount $${dollars.toFixed(2)} exceeds order total $${totalDollars}.`)
        return
      }
      amountCents = Math.round(dollars * 100)
    }

    const confirmMsg = amountCents
      ? `Refund $${(amountCents / 100).toFixed(2)} of order ${order.id}?`
      : `Refund the full $${totalDollars} of order ${order.id}? This cannot be undone.`
    if (!confirm(confirmMsg)) return

    void postAction(
      '/api/admin/orders/refund',
      { orderId: order.id, ...(amountCents != null && { amountCents }) },
      setRefunding,
      onRefunded,
    )
  }

  const cancelOrder = () => {
    if (!confirm(`Cancel order ${order.id}?`)) return
    void postAction(
      '/api/admin/orders/cancel',
      { orderId: order.id },
      setCancelling,
      onRefunded, // same reload — refetches, row moves to cancelled filter
    )
  }

  const meta = STATUS_META[order.status]
  return (
    <li className="bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-start grid grid-cols-[36px_1fr_auto] md:grid-cols-[36px_1.5fr_2fr_1fr_1fr_auto_36px] gap-3 items-center px-5 py-3 hover:bg-surface-raised transition-colors"
        aria-expanded={expanded}
      >
        <span
          className="shrink-0 w-9 h-9 rounded-lg inline-flex items-center justify-center"
          style={{ background: `${meta.tint}1a`, color: meta.tint }}
        >
          <meta.Icon className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-mono text-fg-1 truncate" dir="ltr">
            {order.id}
          </p>
          <p className="md:hidden text-xs text-fg-3 truncate">
            {order.customerName} · {order.itemCount} items
          </p>
        </div>
        <div className="hidden md:block min-w-0">
          <p className="text-sm text-fg-1 truncate">{order.customerName}</p>
          <p className="text-xs text-fg-3 font-mono truncate" dir="ltr">
            {order.customerEmail}
          </p>
        </div>
        <p className="hidden md:block text-xs text-fg-2 font-mono" dir="ltr">
          {tO('itemsCount', { count: order.itemCount })}
        </p>
        <p className="hidden md:block font-mono text-sm text-fg-1" dir="ltr">
          {order.total} <span className="text-xs text-fg-3">USD</span>
        </p>
        <span
          className="hidden md:inline-flex rounded-pill h-5 px-2 items-center text-[10px] uppercase tracking-eyebrow font-bold"
          style={{ background: `${meta.tint}1a`, color: meta.tint }}
        >
          {tStatus(order.status)}
        </span>
        <ChevronDown
          className={`hidden md:block w-4 h-4 text-fg-3 justify-self-end transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          strokeWidth={1.75}
        />
      </button>
      {expanded && (
        <div className="border-t border-border bg-bg-deeper/30 px-5 py-4 space-y-3 text-xs text-fg-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono" dir="ltr">
            <span>
              <span className="text-fg-3">placed </span>
              {new Date(order.placedISO).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span>
              <span className="text-fg-3">customer </span>
              {order.customerEmail || order.customerName}
            </span>
            <span>
              <span className="text-fg-3">items </span>
              {order.itemCount}
            </span>
            <span>
              <span className="text-fg-3">total </span>${order.total.toFixed(2)}
            </span>
          </div>
          {order.status !== 'refunded' && order.status !== 'cancelled' && (
            <div className="flex items-center gap-2">
              {(order.status === 'pending' || order.status === 'processing') && (
                <button
                  type="button"
                  onClick={cancelOrder}
                  disabled={cancelling || refunding}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/25 disabled:opacity-50 disabled:cursor-wait"
                >
                  <XCircle className="w-3 h-3" strokeWidth={1.75} />
                  {cancelling ? 'Cancelling…' : tO('cancel')}
                </button>
              )}
              <button
                type="button"
                onClick={refund}
                disabled={refunding || cancelling}
                className="inline-flex items-center gap-1.5 rounded-pill bg-amber-500/15 h-9 px-4 text-xs font-semibold hover:bg-amber-500/25 disabled:opacity-50 disabled:cursor-wait"
                style={{ color: '#e8912a' }}
              >
                <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
                {refunding ? 'Refunding…' : tO('refund')}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function Stat({
  Icon,
  tint,
  label,
  value,
}: {
  Icon: LucideIcon
  tint: string
  label: string
  value: string | number
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} style={{ color: tint }} />
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {label}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        {value}
      </p>
    </article>
  )
}
