import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const sections = [
  {
    title: 'Acceptance of Terms',
    content: `By accessing or using GreenoFig ("the Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our Service.

These terms apply to all visitors, users, and others who access or use the Service. We reserve the right to update these terms at any time with reasonable notice.`,
  },
  {
    title: 'Description of Service',
    content: `GreenoFig is a health and wellness platform that provides:

• AI-powered nutrition and fitness coaching
• Personalised meal planning tools
• Workout tracking and recommendations
• Access to qualified nutritionists (on applicable plans)
• Progress tracking and analytics

GreenoFig is a wellness tool and does not constitute medical advice. Always consult a qualified healthcare professional before making significant changes to your diet or exercise regime.`,
  },
  {
    title: 'Accounts & Eligibility',
    content: `To use GreenoFig you must:

• Be at least 16 years of age
• Provide accurate and complete registration information
• Maintain the security of your password
• Notify us immediately of any unauthorised use of your account

You are responsible for all activity that occurs under your account. We reserve the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: 'Subscription Plans & Payments',
    content: `GreenoFig offers Free, Basic, Premium, and Elite subscription tiers. Paid subscriptions are billed in advance on a monthly or yearly basis via Stripe.

• Prices are displayed in USD and may be subject to applicable taxes
• Subscriptions automatically renew unless cancelled before the renewal date
• Yearly subscriptions are billed as one payment and are non-refundable after 14 days
• You may cancel your subscription at any time; access continues until the end of the billing period
• We reserve the right to change pricing with 30 days' notice`,
  },
  {
    title: 'Acceptable Use',
    content: `You agree not to:

• Use the Service for any unlawful purpose or in violation of any regulations
• Upload false, misleading, or harmful health information
• Attempt to gain unauthorised access to any part of the Service
• Scrape, copy, or redistribute our content without permission
• Impersonate any person or entity
• Use the Service to harass, abuse, or harm others

Violation of these rules may result in immediate account termination.`,
  },
  {
    title: 'Health Disclaimer',
    content: `GreenoFig provides general wellness information and tools. The content on this platform, including AI-generated recommendations, is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.

Always seek the advice of a qualified healthcare provider with any questions about your health. Never disregard professional medical advice because of something you read on GreenoFig.`,
  },
  {
    title: 'Intellectual Property',
    content: `The Service and its original content, features, and functionality are owned by GreenoFig and are protected by international copyright, trademark, and other intellectual property laws.

You retain ownership of any health data you enter into the platform. By using the Service, you grant GreenoFig a limited licence to use your data to provide and improve the Service as described in our Privacy Policy.`,
  },
  {
    title: 'Limitation of Liability',
    content: `To the maximum extent permitted by law, GreenoFig shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.

Our total liability to you for any claims arising from these terms shall not exceed the amount you paid to GreenoFig in the 12 months preceding the claim.`,
  },
  {
    title: 'Termination',
    content: `We may terminate or suspend your account at any time, with or without cause and with or without notice, if we believe you have violated these Terms.

You may delete your account at any time through the Settings page. Upon termination, your right to use the Service ceases immediately.`,
  },
  {
    title: 'Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.

Any disputes arising from these terms shall be resolved through binding arbitration, except where prohibited by law.`,
  },
  {
    title: 'Contact',
    content: `If you have questions about these Terms, contact us at:

**Email**: legal@greenofig.com
**Address**: 123 Health Street, Wellness City, WC 12345`,
  },
]

export default function TermsOfService() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-primary" />
              </div>
            </div>
            <Badge className="mb-4" variant="secondary">Legal</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Terms of Service</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Please read these terms carefully before using GreenoFig. They govern your use of our platform.
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
                transition={{ delay: i * 0.04 }}
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
