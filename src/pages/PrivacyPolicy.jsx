import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const sections = [
  {
    title: 'Information We Collect',
    content: `We collect information you provide directly to us when you create an account, complete our health survey, use our services, or contact us for support. This includes:

• **Account information**: name, email address, password
• **Health & wellness data**: weight, height, dietary preferences, fitness goals, activity levels
• **Usage data**: how you interact with our features, logs, and progress entries
• **Device information**: IP address, browser type, operating system
• **Communications**: messages you send to nutritionists or our support team`,
  },
  {
    title: 'How We Use Your Information',
    content: `We use the information we collect to:

• Provide, maintain, and improve our services
• Personalise your nutrition and fitness recommendations
• Connect you with qualified nutritionists
• Send service updates, security alerts, and support messages
• Analyse usage patterns to enhance our platform
• Comply with legal obligations

We do not sell your personal health information to third parties.`,
  },
  {
    title: 'Data Sharing',
    content: `We share your information only in the following circumstances:

• **With your nutritionist**: health data you enter is visible to any nutritionist you are matched with
• **Service providers**: we use trusted third parties (Supabase for data storage, Stripe for payments, Google Gemini for AI) under strict data processing agreements
• **Legal requirements**: when required by law or to protect the rights and safety of our users
• **Business transfers**: in the event of a merger or acquisition, with advance notice to you`,
  },
  {
    title: 'Data Security',
    content: `We take the security of your data seriously. We implement industry-standard measures including:

• Encryption in transit (TLS) and at rest
• Row-Level Security (RLS) enforced at the database level
• Regular security audits and penetration testing
• Access controls limiting who can see your data

No system is 100% secure. If you suspect unauthorised access to your account, contact us immediately at security@greenofig.com.`,
  },
  {
    title: 'Your Rights',
    content: `Depending on your location, you may have the right to:

• **Access**: request a copy of the personal data we hold about you
• **Correction**: ask us to correct inaccurate data
• **Deletion**: request deletion of your account and associated data
• **Portability**: receive your data in a machine-readable format
• **Objection**: object to certain types of processing

To exercise any of these rights, email us at privacy@greenofig.com. We will respond within 30 days.`,
  },
  {
    title: 'Cookies',
    content: `We use cookies and similar technologies to keep you logged in, remember your preferences, and understand how our platform is used. For full details, see our Cookie Policy. You can control cookies through your browser settings.`,
  },
  {
    title: 'Children\'s Privacy',
    content: `GreenoFig is not directed at children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, contact us and we will delete it promptly.`,
  },
  {
    title: 'Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or through a prominent notice on our platform. Continued use of GreenoFig after changes take effect constitutes your acceptance of the updated policy.`,
  },
  {
    title: 'Contact Us',
    content: `If you have any questions about this Privacy Policy or how we handle your data, contact us at:

**Email**: privacy@greenofig.com
**Address**: 123 Health Street, Wellness City, WC 12345
**Phone**: +1 (555) 123-4567`,
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-7 w-7 text-primary" />
              </div>
            </div>
            <Badge className="mb-4" variant="secondary">Legal</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Your privacy matters to us. This policy explains what data we collect, why we collect it, and how we protect it.
            </p>
            <p className="text-sm text-muted-foreground mt-4">Last updated: January 1, 2025</p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {sections.map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="mb-10"
              >
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  {i + 1}. {section.title}
                </h2>
                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
