import { Gift } from '@/icons'
import { SendDiscountSection } from '@/components/nutritionist/SendDiscountSection'

export default function AdminCouponsPage() {
  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex items-start gap-3">
        <Gift
          className="w-6 h-6 mt-1 flex-shrink-0"
          strokeWidth={1.75}
          color="#a3e635"
        />
        <div className="min-w-0">
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            Coupons &amp; Discounts
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2 max-w-2xl">
            Create promo codes and tier-targeted discounts. Codes you create here are tracked under your admin account.
          </p>
        </div>
      </header>
      <SendDiscountSection />
    </div>
  )
}
