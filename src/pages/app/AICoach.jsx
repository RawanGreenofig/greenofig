import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

const suggestedQuestions = [
  'What should I eat for breakfast?',
  'How can I improve my sleep?',
  'Create a workout for today',
  'Tips for staying motivated',
]

const initialMessages = [
  {
    id: 1,
    role: 'assistant',
    content: "Hi! I'm your GreenoFig AI Health Coach. I'm here to help you with nutrition advice, workout suggestions, and overall wellness guidance. How can I help you today?",
  },
]

export default function AICoach() {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const { userProfile } = useAuth()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const generateResponse = async (userMessage) => {
    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500))

    const responses = {
      breakfast: "For a nutritious breakfast, I recommend starting with protein-rich foods like eggs or Greek yogurt, paired with complex carbs such as oatmeal or whole-grain toast. Add some fruits for vitamins and fiber. This combination will keep you energized throughout the morning!",
      sleep: "To improve your sleep quality, try these tips:\n\n1. Maintain a consistent sleep schedule\n2. Avoid screens 1 hour before bed\n3. Keep your bedroom cool and dark\n4. Limit caffeine after 2 PM\n5. Try relaxation techniques like deep breathing\n\nWould you like more specific advice?",
      workout: "Here's a quick full-body workout for today:\n\n1. Warm-up (5 min): Jumping jacks, arm circles\n2. Squats: 3 sets of 12\n3. Push-ups: 3 sets of 10\n4. Lunges: 3 sets of 10 each leg\n5. Plank: 3 sets of 30 seconds\n6. Cool-down: Stretching\n\nRemember to rest 60 seconds between sets!",
      motivated: "Staying motivated is about building sustainable habits. Here are my top tips:\n\n1. Set small, achievable goals\n2. Track your progress daily\n3. Celebrate small wins\n4. Find an accountability partner\n5. Remember your 'why'\n\nWhat specific area are you struggling with motivation?",
      default: "That's a great question! Based on your health profile, I'd recommend focusing on balanced nutrition and regular physical activity. Would you like me to provide more specific guidance on nutrition, fitness, or another aspect of your wellness journey?",
    }

    const lowerMessage = userMessage.toLowerCase()
    if (lowerMessage.includes('breakfast') || lowerMessage.includes('eat')) {
      return responses.breakfast
    } else if (lowerMessage.includes('sleep')) {
      return responses.sleep
    } else if (lowerMessage.includes('workout') || lowerMessage.includes('exercise')) {
      return responses.workout
    } else if (lowerMessage.includes('motivat')) {
      return responses.motivated
    }
    return responses.default
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await generateResponse(input)
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error generating response:', error)
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
              <h1 className="font-semibold">AI Health Coach</h1>
              <p className="text-sm text-muted-foreground">Powered by AI</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {userProfile?.tier || 'Free'} Plan
          </Badge>
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
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' ? 'bg-primary' : 'bg-muted'
              }`}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Bot className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Card className={`max-w-[80%] p-4 ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'
              }`}>
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
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
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </Card>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
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
            placeholder="Ask me anything about health, nutrition, or fitness..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI responses are for informational purposes. Consult a healthcare professional for medical advice.
        </p>
      </div>
    </div>
  )
}
