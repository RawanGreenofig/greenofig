import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { generateAIResponse } from '@/lib/gemini'
import toast from 'react-hot-toast'

export default function AICoach() {
  const { t } = useTranslation()
  const { user, userProfile } = useAuth()

  const suggestedQuestions = [
    t('aiCoach.suggestions.breakfast'),
    t('aiCoach.suggestions.sleep'),
    t('aiCoach.suggestions.workout'),
    t('aiCoach.suggestions.motivation'),
  ]

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history from database
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!isSupabaseConfigured() || !user) {
        setIsLoadingHistory(false)
        setMessages([{
          id: 1,
          sender: 'assistant',
          text: t('aiCoach.greeting'),
          created_at: new Date().toISOString()
        }])
        return
      }

      try {
        const { data, error } = await supabase
          .from('ai_chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) throw error

        if (data && data.length > 0) {
          setMessages(data)
        } else {
          // Add welcome message for new users
          const welcomeMessage = {
            id: Date.now(),
            sender: 'assistant',
            text: t('aiCoach.greeting'),
            created_at: new Date().toISOString()
          }
          setMessages([welcomeMessage])

          // Save welcome message to database
          await supabase.from('ai_chat_messages').insert({
            user_id: user.id,
            sender: 'assistant',
            text: t('aiCoach.greeting')
          })
        }
      } catch (error) {
        console.error('Error loading chat history:', error)
        setMessages([{
          id: 1,
          sender: 'assistant',
          text: t('aiCoach.greeting'),
          created_at: new Date().toISOString()
        }])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    loadChatHistory()
  }, [user, t])

  const saveMessage = async (sender, text) => {
    if (!isSupabaseConfigured() || !user) return null

    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert({
          user_id: user.id,
          sender,
          text
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error saving message:', error)
      return null
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessageText = input.trim()
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: userMessageText,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Save user message to database
    saveMessage('user', userMessageText)

    try {
      // Get conversation history for context (last 10 messages)
      const recentMessages = messages.slice(-10)

      // Call Gemini API
      const response = await generateAIResponse(userMessageText, recentMessages)

      const assistantMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response,
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])

      // Save assistant message to database
      saveMessage('assistant', response)
    } catch (error) {
      console.error('Error generating response:', error)
      toast.error(t('aiCoach.errorGenerating') || 'Failed to generate response. Please try again.')

      // Add fallback message
      const fallbackMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: t('aiCoach.fallbackResponse') || "I'm having trouble responding right now. Please try again in a moment!",
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionClick = (question) => {
    setInput(question)
  }

  const handleClearChat = async () => {
    if (!user) return

    try {
      if (isSupabaseConfigured()) {
        await supabase
          .from('ai_chat_messages')
          .delete()
          .eq('user_id', user.id)
      }

      const welcomeMessage = {
        id: Date.now(),
        sender: 'assistant',
        text: t('aiCoach.greeting'),
        created_at: new Date().toISOString()
      }
      setMessages([welcomeMessage])

      if (isSupabaseConfigured()) {
        await supabase.from('ai_chat_messages').insert({
          user_id: user.id,
          sender: 'assistant',
          text: t('aiCoach.greeting')
        })
      }

      toast.success(t('aiCoach.chatCleared') || 'Chat cleared')
    } catch (error) {
      console.error('Error clearing chat:', error)
      toast.error(t('common.error') || 'Error clearing chat')
    }
  }

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{t('aiCoach.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('aiCoach.poweredBy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearChat}
              title={t('aiCoach.clearChat') || 'Clear chat'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {userProfile?.tier || 'Base'} {t('aiCoach.plan')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.sender === 'user' ? 'bg-primary' : 'bg-muted'
              }`}>
                {message.sender === 'user' ? (
                  <User className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Bot className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Card className={`max-w-[80%] p-4 ${
                message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{message.text}</p>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('aiCoach.thinking')}</span>
              </div>
            </Card>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground mb-2">{t('aiCoach.tryAsking')}</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(question)}
                className="text-xs"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('aiCoach.inputPlaceholder')}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {t('aiCoach.disclaimer')}
        </p>
      </div>
    </div>
  )
}
