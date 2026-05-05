import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// Placeholder ad content - replace with real ad network code
const adSizes = {
  banner: { width: 728, height: 90 },
  sidebar: { width: 300, height: 250 },
  leaderboard: { width: 970, height: 90 },
  rectangle: { width: 336, height: 280 },
  skyscraper: { width: 160, height: 600 },
}

export function BannerAd({
  size = 'banner',
  className,
  position = 'inline' // inline, sticky, fixed
}) {
  const { shouldShowAds } = useAuth()

  // Don't render if user shouldn't see ads
  if (!shouldShowAds()) return null

  const dimensions = adSizes[size] || adSizes.banner

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/20 rounded-lg overflow-hidden",
        position === 'sticky' && "sticky top-20",
        className
      )}
      style={{
        minWidth: dimensions.width,
        minHeight: dimensions.height,
        maxWidth: '100%'
      }}
    >
      {/* Replace this placeholder with actual ad code */}
      <div className="text-center p-4 text-muted-foreground">
        <p className="text-xs uppercase tracking-wider mb-1">Advertisement</p>
        <div
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded flex items-center justify-center"
          style={{ width: Math.min(dimensions.width, 300), height: Math.min(dimensions.height, 150) }}
        >
          <span className="text-xs text-muted-foreground/50">
            {dimensions.width} x {dimensions.height}
          </span>
        </div>
        {/*
          To integrate real ads, replace the above placeholder with:
          - Google AdSense: <ins className="adsbygoogle" data-ad-client="..." data-ad-slot="..."></ins>
          - Or any other ad network script
        */}
      </div>
    </div>
  )
}

export function SidebarAd({ className }) {
  return <BannerAd size="sidebar" className={className} position="sticky" />
}

export function LeaderboardAd({ className }) {
  return <BannerAd size="leaderboard" className={cn("mx-auto", className)} />
}

export function InArticleAd({ className }) {
  const { shouldShowAds } = useAuth()

  if (!shouldShowAds()) return null

  return (
    <div className={cn("my-8 py-4 border-y border-muted", className)}>
      <p className="text-xs text-muted-foreground text-center mb-2">Sponsored</p>
      <BannerAd size="rectangle" className="mx-auto" />
    </div>
  )
}
