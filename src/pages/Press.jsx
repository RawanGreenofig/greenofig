import { motion } from 'framer-motion'
import { Newspaper, Mail, Download, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const stats = [
  { value: '50K+', label: 'Active Users' },
  { value: '1M+', label: 'Meals Tracked' },
  { value: '4.9★', label: 'App Rating' },
  { value: '2021', label: 'Founded' },
]

const coverage = [
  {
    outlet: 'TechCrunch',
    headline: 'GreenoFig is making personalised nutrition accessible to everyone',
    date: 'March 2024',
  },
  {
    outlet: 'Forbes Health',
    headline: 'The AI-powered apps transforming how we eat',
    date: 'January 2024',
  },
  {
    outlet: 'Healthline',
    headline: 'Best nutrition tracking apps of 2024',
    date: 'December 2023',
  },
  {
    outlet: 'Product Hunt',
    headline: '#1 Product of the Day — GreenoFig AI Health Coach',
    date: 'October 2023',
  },
]

const assets = [
  { name: 'Logo Pack (SVG + PNG)', size: '2.4 MB' },
  { name: 'Product Screenshots', size: '18 MB' },
  { name: 'Brand Guidelines', size: '4.1 MB' },
  { name: 'Founder Headshots', size: '6.8 MB' },
]

export default function Press() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Newspaper className="h-7 w-7 text-primary" />
              </div>
            </div>
            <Badge className="mb-4" variant="secondary">Press & Media</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Press Room</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Resources for journalists and media professionals covering GreenoFig.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">

          {/* About */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-4">About GreenoFig</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              GreenoFig is a health and wellness platform that combines AI-powered coaching with access to certified nutritionists to help people build lasting, healthy habits. Founded in 2021, GreenoFig has helped over 50,000 users achieve their nutrition and fitness goals through personalised meal plans, intelligent workout recommendations, and real-time progress tracking.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our mission is to make professional-grade health guidance accessible to everyone — not just those who can afford a personal nutritionist. With GreenoFig's Free tier, anyone can start tracking their health journey at no cost.
            </p>
          </motion.div>

          {/* Recent Coverage */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-6">Recent Coverage</h2>
            <div className="space-y-3">
              {coverage.map((item, i) => (
                <Card key={i} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-primary">{item.outlet}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                      </div>
                      <p className="text-sm text-foreground">{item.headline}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Media Kit */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-2">Media Kit</h2>
            <p className="text-muted-foreground mb-6">Download official brand assets for use in articles and publications.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {assets.map((asset, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.size}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Press Contact */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-bold mb-2">Press Contact</h2>
                <p className="text-muted-foreground mb-4">
                  For interview requests, quotes, or media inquiries, reach out to our press team.
                </p>
                <p className="text-lg font-semibold text-primary">press@greenofig.com</p>
                <p className="text-sm text-muted-foreground mt-1">We aim to respond within 24 hours</p>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </section>
    </div>
  )
}
