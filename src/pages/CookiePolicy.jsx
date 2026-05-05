import { motion } from 'framer-motion'
import { Cookie } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const cookieTypes = [
  {
    name: 'Essential Cookies',
    required: true,
    description: 'These cookies are necessary for the website to function and cannot be switched off. They are set in response to actions you take such as logging in or setting your preferences.',
    examples: ['Authentication token (keeps you logged in)', 'Theme preference (dark/light mode)', 'Language preference'],
  },
  {
    name: 'Analytics Cookies',
    required: false,
    description: 'These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. All information these cookies collect is aggregated and anonymous.',
    examples: ['Page views and navigation paths', 'Time spent on pages', 'Error and performance tracking'],
  },
  {
    name: 'Functional Cookies',
    required: false,
    description: 'These cookies enable the website to provide enhanced functionality and personalisation. They may be set by us or by third-party providers whose services we use.',
    examples: ['Remembering your health goals across sessions', 'Saving your meal log preferences', 'AI chat conversation context'],
  },
]

export default function CookiePolicy() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Cookie className="h-7 w-7 text-primary" />
              </div>
            </div>
            <Badge className="mb-4" variant="secondary">Legal</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              This policy explains how GreenoFig uses cookies and similar technologies on our platform.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: January 1, 2025</p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-4">What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help the site remember information about your visit — such as your preferred language and other settings — which can make your next visit easier and the site more useful.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-6">Types of Cookies We Use</h2>
            <div className="space-y-4">
              {cookieTypes.map((type, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold">{type.name}</h3>
                      <Badge variant={type.required ? 'default' : 'secondary'}>
                        {type.required ? 'Required' : 'Optional'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">{type.description}</p>
                    <div>
                      <p className="text-sm font-medium mb-2">Examples:</p>
                      <ul className="space-y-1">
                        {type.examples.map((ex, j) => (
                          <li key={j} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-4">How to Control Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can control and manage cookies in your browser settings. Please note that removing or blocking cookies may impact your user experience and some functionality may no longer be available.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Most browsers allow you to refuse cookies or delete them. The methods for doing so vary from browser to browser. Visit your browser's help documentation for instructions:
            </p>
            <ul className="mt-3 space-y-1 text-muted-foreground text-sm">
              {['Chrome', 'Firefox', 'Safari', 'Edge'].map(b => (
                <li key={b} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {b} — Settings → Privacy & Security → Cookies
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-4">Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some of our pages may contain content from third parties (such as Stripe for payment processing). These third parties may set their own cookies. We do not control these cookies, and you should check the relevant third-party website for more information about their policies.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time. We will notify you of any significant changes by posting the new policy on this page with an updated date.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, contact us at <span className="text-primary">privacy@greenofig.com</span>.
            </p>
          </motion.div>

        </div>
      </section>
    </div>
  )
}
