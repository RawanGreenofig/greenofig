import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Bot,
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  User,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const QUICK_PROMPTS = [
  { key: 'mealIdeas', icon: '🍽️' },
  { key: 'workout', icon: '💪' },
  { key: 'nutrition', icon: '🥗' },
  { key: 'wellness', icon: '😴' },
]

export function FloatingAIChat() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { isAuthenticated, isPremium, tier } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: t('aiCoach.welcome'),
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen, messages.length, t])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Simulate AI response (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getSimulatedResponse(userMessage.content),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiResponse])
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('aiCoach.error'),
        timestamp: new Date(),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickPrompt = (key) => {
    setInputValue(t(`aiCoach.suggestions.${key}`))
    inputRef.current?.focus()
  }

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('aiCoach.welcome'),
        timestamp: new Date(),
      },
    ])
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Simulated response (replace with actual AI integration)
  const getSimulatedResponse = (input) => {
    const responses = [
      "That's a great question! Based on your health goals, I recommend focusing on balanced nutrition and regular exercise. Would you like specific meal or workout suggestions?",
      "I'd be happy to help you with that! For optimal health, consider incorporating more whole foods, staying hydrated, and getting adequate sleep. What specific area would you like to focus on?",
      "Excellent choice for your wellness journey! I can create a personalized plan for you. Let me know your current fitness level and any dietary restrictions you have.",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-50 h-14 w-14 rounded-full bg-primary shadow-glow',
          'flex items-center justify-center',
          'hover:shadow-glow-lg transition-shadow',
          'pulse-glow',
          isRTL ? 'left-6' : 'right-6',
          'bottom-6',
          isOpen && 'hidden'
        )}
        aria-label={t('aiCoach.title')}
      >
        <Bot className="h-6 w-6 text-primary-foreground" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed z-50 flex flex-col',
              'bg-card border rounded-2xl shadow-2xl overflow-hidden',
              isMinimized
                ? 'w-80 h-14'
                : 'w-[380px] h-[600px] max-h-[80vh]',
              isRTL ? 'left-6' : 'right-6',
              'bottom-6'
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t('aiCoach.title')}</h3>
                  {!isMinimized && (
                    <p className="text-xs text-muted-foreground">
                      {isLoading ? t('aiCoach.typing') : t('aiCoach.subtitle')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isMinimized && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleClearChat}
                    title={t('aiCoach.clearHistory')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'flex gap-3',
                          message.role === 'user' && 'flex-row-reverse'
                        )}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback
                            className={cn(
                              message.role === 'assistant'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            {message.role === 'assistant' ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2 max-w-[80%]',
                            message.role === 'assistant'
                              ? 'bg-muted'
                              : 'bg-primary text-primary-foreground',
                            message.isError && 'bg-destructive/10 text-destructive'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </motion.div>
                    ))}

                    {/* Loading indicator */}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Quick Prompts */}
                {messages.length <= 1 && (
                  <div className="px-4 pb-2">
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map(({ key, icon }) => (
                        <button
                          key={key}
                          onClick={() => handleQuickPrompt(key)}
                          className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent transition-colors flex items-center gap-1"
                        >
                          <span>{icon}</span>
                          <span className="truncate max-w-[120px]">
                            {t(`aiCoach.suggestions.${key}`)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSend()
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={t('aiCoach.placeholder')}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!inputValue.trim() || isLoading}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default FloatingAIChat
