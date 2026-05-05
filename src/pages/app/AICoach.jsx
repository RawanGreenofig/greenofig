import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Bot, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function AICoach() {
  const { t } = useTranslation()

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t('aiCoach.title')}</h1>
        <p className="text-muted-foreground">{t('aiCoach.subtitle')}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <Card glass className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('aiCoach.title')}</h2>
            <p className="text-muted-foreground mb-4">
              {t('aiCoach.welcome')}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
              <Sparkles className="h-4 w-4" />
              {t('placeholder.workingOnIt')}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
