'use client'


import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  ChevronDown,
  Download,
  ShoppingBag,
  ArrowRight,
  type LucideIcon,
} from '@/icons'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'

type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

interface OrderItem {
  name: string
  qty: number
  unitPrice: number
  hue: string
}

interface Order {
  id: string
  status: OrderStatus
  placedAt: string
  deliveredAt?: string
  estimatedAt?: string
  trackingNumber?: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  shipTo: string
  paymentLast4: string
}

const STATUS_META: Record<
  OrderStatus,
  { Icon: LucideIcon; tint: string; bg: string }
> = {
  pending:    { Icon: Clock,        tint: '#9baf9f', bg: 'rgb(155 175 159 / 0.12)' },
  processing: { Icon: Package,      tint: '#06b6d4', bg: 'rgb(6 182 212 / 0.12)' },
  shipped:    { Icon: Truck,        tint: '#e8912a', bg: 'rgb(232 145 42 / 0.12)' },
  delivered:  { Icon: CheckCircle2, tint: '#a3e635', bg: 'rgb(163 230 53 / 0.14)' },
  cancelled:  { Icon: XCircle,      tint: '#f43f5e', bg: 'rgb(244 63 94 / 0.12)' },
  refunded:   { Icon: RotateCcw,    tint: '#a855f7', bg: 'rgb(168 85 247 / 0.12)' },
}

const FILTER_TABS: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

/** Demo seed — replaced by `orders` table query in Cluster H */
const SEED: Order[] = [
  {
    id: 'GF-10248',
    status: 'shipped',
    placedAt: '2026-04-29',
    estimatedAt: '2026-05-05',
    trackingNumber: 'JOR-9482-7361',
    items: [
      { name: 'Daily Greens Powder',        qty: 1, unitPrice: 28, hue: 'rgb(163 230 53 / 0.18)' },
      { name: 'Magnesium Glycinate 200 mg', qty: 2, unitPrice: 19, hue: 'rgb(168 85 247 / 0.18)' },
    ],
    subtotal: 66,
    shipping: 0,
    total: 66,
    shipTo: 'Amman, Jordan',
    paymentLast4: '4242',
  },
  {
    id: 'GF-10199',
    status: 'delivered',
    placedAt: '2026-04-15',
    deliveredAt: '2026-04-19',
    trackingNumber: 'JOR-9381-2244',
    items: [
      { name: 'Mediterranean Olive Oil', qty: 1, unitPrice: 22, hue: 'rgb(132 204 22 / 0.18)' },
      { name: 'Almond Butter (raw)',     qty: 1, unitPrice: 14, hue: 'rgb(232 145 42 / 0.18)' },
      { name: 'Chia Seeds 500g',         qty: 2, unitPrice: 8,  hue: 'rgb(168 85 247 / 0.16)' },
    ],
    subtotal: 52,
    shipping: 0,
    total: 52,
    shipTo: 'Amman, Jordan',
    paymentLast4: '4242',
  },
  {
    id: 'GF-10142',
    status: 'delivered',
    placedAt: '2026-03-22',
    deliveredAt: '2026-03-26',
    items: [
      { name: 'Vitamin D3 + K2',     qty: 1, unitPrice: 24, hue: 'rgb(232 145 42 / 0.18)' },
      { name: 'Omega-3 Fish Oil',    qty: 1, unitPrice: 32, hue: 'rgb(6 182 212 / 0.16)' },
    ],
    subtotal: 56,
    shipping: 4,
    total: 60,
    shipTo: 'Amman, Jordan',
    paymentLast4: '4242',
  },
]

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function OrdersPage() {
  const t = useTranslations('orders')
  const tStore = useTranslations('store')
  const { profile } = useUser()
  const userId = profile?.id ?? null
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const liveOrders = useSupabaseQuery<Order[]>(async (supabase) => {
    if (!userId) return []

    // Line items live INSIDE orders.items as JSONB — there's no separate
    // order_items table. Money columns are *_cents; divide by 100 for the
    // display values the rest of the page expects.
    type LineItem = {
      product_id?: string
      productId?: string
      qty?: number
      unit_price_cents?: number
      unit_price?: number
    }
    type Row = {
      id: string
      status: OrderStatus
      created_at: string
      tracking_number: string | null
      subtotal_cents: number | null
      total_cents: number | null
      shipping_address: { line1?: string; city?: string; country?: string } | null
      items: LineItem[] | null
    }
    const { data: orderRows } = await supabase
      .from('orders')
      .select(
        'id, status, created_at, tracking_number, subtotal_cents, total_cents,' +
          ' shipping_address, items',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
    const rows = (orderRows as Row[] | null) ?? []
    if (rows.length === 0) return []

    // Pull product names for whatever product_ids the items reference.
    const productIds = Array.from(
      new Set(
        rows.flatMap((r) =>
          (r.items ?? []).map((i) => i.product_id ?? i.productId).filter(Boolean) as string[],
        ),
      ),
    )
    const { data: productRows } = productIds.length
      ? await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds)
      : { data: [] }
    type ProductRow = { id: string; name: string }
    const productOf = new Map(
      ((productRows as ProductRow[] | null) ?? []).map((p) => [p.id, p]),
    )

    return rows.map((r) => {
      const lines = (r.items ?? []).map((l) => {
        const productId = l.product_id ?? l.productId ?? ''
        const p = productOf.get(productId)
        const unitPrice =
          typeof l.unit_price_cents === 'number'
            ? l.unit_price_cents / 100
            : l.unit_price ?? 0
        return {
          name: p?.name ?? 'Product',
          qty: l.qty ?? 1,
          unitPrice,
          hue: 'rgb(132 204 22 / 0.16)',
        }
      })
      const addr = r.shipping_address
      const shipTo = addr
        ? [addr.line1, addr.city, addr.country].filter(Boolean).join(', ')
        : ''
      return {
        id: r.id,
        status: r.status,
        placedAt: r.created_at,
        deliveredAt: undefined,
        estimatedAt: undefined,
        trackingNumber: r.tracking_number ?? undefined,
        items: lines,
        subtotal: (r.subtotal_cents ?? 0) / 100,
        shipping: 0,
        total: (r.total_cents ?? 0) / 100,
        shipTo,
        paymentLast4: '••••',
      }
    })
  }, [userId])

  const orders = (liveOrders.data && liveOrders.data.length > 0)
    ? liveOrders.data
    : SEED

  const visible = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [filter, orders],
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          <span className="gradient-text">{t('title')}</span>
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
      </header>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {FILTER_TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
              filter === s
                ? 'bg-primary/20 text-lime-400 border border-primary/40'
                : 'bg-surface border border-border text-fg-2 hover:border-primary/40'
            }`}
          >
            {t(s)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState t={t} tStore={tStore} />
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => (
            <OrderRow
              key={o.id}
              t={t}
              order={o}
              expanded={openId === o.id}
              onToggle={() =>
                setOpenId((curr) => (curr === o.id ? null : o.id))
              }
            />
          ))}
        </ul>
      )}
    </motion.div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function OrderRow({
  t,
  order,
  expanded,
  onToggle,
}: {
  t: ReturnType<typeof useTranslations>
  order: Order
  expanded: boolean
  onToggle: () => void
}) {
  const meta = STATUS_META[order.status]
  const itemCount = order.items.reduce((acc, i) => acc + i.qty, 0)

  return (
    <li className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-start flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-surface-raised transition-colors"
        aria-expanded={expanded}
      >
        <meta.Icon
          className="w-6 h-6 flex-shrink-0"
          strokeWidth={1.75}
          style={{ color: meta.tint }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="text-sm font-semibold text-fg-1 font-mono" dir="ltr">
              {t('orderNumber', { id: order.id.replace('GF-', '') })}
            </p>
            <span
              className="rounded-pill px-2 h-5 text-[10px] uppercase tracking-eyebrow font-bold"
              style={{ background: meta.bg, color: meta.tint }}
            >
              {t(order.status)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-fg-3" dir="ltr">
            {t('placedOn', { date: fmtDate(order.placedAt) })} ·{' '}
            {t('items', { count: itemCount })}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="text-sm font-mono font-semibold text-fg-1" dir="ltr">
            {order.total} <span className="text-xs text-fg-3">USD</span>
          </p>
          <ChevronDown
            className={`mt-1 ms-auto w-4 h-4 text-fg-3 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
            strokeWidth={1.75}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border bg-bg-deeper/30 px-5 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {order.deliveredAt ? (
              <DetailRow
                label={t('deliveredOn', { date: fmtDate(order.deliveredAt) })}
              />
            ) : order.estimatedAt ? (
              <DetailRow
                label={t('estDelivery', { date: fmtDate(order.estimatedAt) })}
              />
            ) : (
              <DetailRow label={t(order.status)} />
            )}
            <DetailRow label={`${t('shipTo')}: ${order.shipTo}`} />
            <DetailRow
              label={`${t('paymentMethod')}: •••• ${order.paymentLast4}`}
              mono
            />
          </div>

          {/* Items */}
          <ul className="divide-y divide-border rounded-lg bg-surface border border-border">
            {order.items.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="shrink-0 w-10 h-10 rounded-md"
                  style={{ background: item.hue }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg-1 truncate">{item.name}</p>
                  <p className="text-xs text-fg-3 font-mono" dir="ltr">
                    × {item.qty}
                  </p>
                </div>
                <p className="font-mono text-sm text-fg-1 shrink-0" dir="ltr">
                  {item.qty * item.unitPrice}{' '}
                  <span className="text-xs text-fg-3">USD</span>
                </p>
              </li>
            ))}
          </ul>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {order.trackingNumber && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-bg-deeper border border-border h-9 px-4 text-xs font-mono text-fg-2" dir="ltr">
                <Truck className="w-3.5 h-3.5 text-fg-3" strokeWidth={1.75} />
                {order.trackingNumber}
              </span>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('downloadInvoice')}
            </button>
            {order.status === 'delivered' && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                {t('reorder')}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

function DetailRow({
  label,
  mono,
}: {
  label: string
  mono?: boolean
}) {
  return (
    <div
      className={`text-xs text-fg-2 ${mono ? 'font-mono' : ''}`}
      dir={mono ? 'ltr' : undefined}
    >
      {label}
    </div>
  )
}

function EmptyState({
  t,
  tStore,
}: {
  t: ReturnType<typeof useTranslations>
  tStore: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
      <ShoppingBag
        className="w-9 h-9 mx-auto mb-3 text-fg-3"
        strokeWidth={1.5}
      />
      <p className="text-base font-semibold text-fg-1">{t('noOrders')}</p>
      <p className="mt-1 text-sm text-fg-2">{t('noOrdersBody')}</p>
      <Link
        href="/dashboard/store"
        className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
      >
        {tStore('browseStore')}
        <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.25} />
      </Link>
    </div>
  )
}
