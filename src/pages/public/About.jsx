import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Heart, Target, Users, Award } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const values = [
  { icon: Heart, key: 'passion', color: 'text-red-500' },
  { icon: Target, key: 'excellence', color: 'text-blue-500' },
  { icon: Users, key: 'community', color: 'text-green-500' },
  { icon: Award, key: 'innovation', color: 'text-purple-500' },
]

export default function About() {
  const { t } = useTranslation()

  return (
    <div className="page-enter pt-20">
      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              {t('nav.about')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-3xl mx-auto"
            >
              {t('app.description')}
            </motion.p>
          </div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto mb-20"
          >
            <Card glass>
              <CardContent className="p-8 md:p-12 text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 gradient-text">
                  Our Mission
                </h2>
                <p className="text-lg text-muted-foreground">
                  To empower individuals worldwide to achieve their health and wellness goals through personalized AI-driven guidance, expert nutritionist support, and a supportive community that celebrates every step of the journey.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Values */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, key, color }, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="h-full text-center">
                  <CardContent className="p-6">
                    <div className={`w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 ${color}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-semibold mb-2 capitalize">{key}</h3>
                    <p className="text-sm text-muted-foreground">
                      We are dedicated to bringing {key} to everything we do for our users.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
