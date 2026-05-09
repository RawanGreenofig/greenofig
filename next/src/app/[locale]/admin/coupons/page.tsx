import { Gift } from 'lucide-react'
import { SendDiscountSection } from '@/components/nutritionist/SendDiscountSection'

export default function AdminCouponsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-fg-1 flex items-center gap-2">
          <Gift className="w-6 h-6" strokeWidth={1.75} style={{ color: '#a3e635' }} />
          Coupons & Discounts
        </h1>
        <p className="text-sm text-fg-3 mt-1">
          Create promo codes and tier-targeted discounts. Codes you create here are tracked under your admin account.
        </p>
      </header>
      <SendDiscountSection />
    </div>
  )
}
