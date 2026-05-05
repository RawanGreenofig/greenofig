import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  MessageSquare, Search, Send, Paperclip, MoreVertical,
  Phone, Video, Info, Check, CheckCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function NutritionistMessages() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      setConversations([
        { id: '1', client_name: 'Sarah Johnson', client_email: 'sarah@example.com', last_message: 'Thanks for the meal plan!', last_message_time: '2024-01-25T10:30:00', unread: 2 },
        { id: '2', client_name: 'Mike Chen', client_email: 'mike@example.com', last_message: 'Quick question about protein intake', last_message_time: '2024-01-25T09:15:00', unread: 1 },
        { id: '3', client_name: 'Emma Wilson', client_email: 'emma@example.com', last_message: 'See you tomorrow!', last_message_time: '2024-01-24T18:45:00', unread: 0 },
        { id: '4', client_name: 'John Doe', client_email: 'john@example.com', last_message: 'Is it okay to have cheat meals?', last_message_time: '2024-01-24T14:20:00', unread: 0 },
        { id: '5', client_name: 'Lisa Brown', client_email: 'lisa@example.com', last_message: 'I lost 2kg this week!', last_message_time: '2024-01-23T11:00:00', unread: 0 },
      ])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (content, created_at, is_read)
        `)
        .eq('nutritionist_id', user?.id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setConversations(data?.map(conv => ({
        id: conv.id,
        client_name: conv.client_name,
        client_email: conv.client_email,
        last_message: conv.messages?.[0]?.content,
        last_message_time: conv.messages?.[0]?.created_at,
        unread: conv.messages?.filter(m => !m.is_read).length || 0
      })) || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error('Failed to fetch conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId) => {
    if (!isSupabaseConfigured()) {
      // Mock messages
      setMessages([
        { id: '1', content: 'Hi! I wanted to ask about my meal plan.', sender: 'client', time: '10:00 AM', is_read: true },
        { id: '2', content: 'Of course! What would you like to know?', sender: 'nutritionist', time: '10:05 AM', is_read: true },
        { id: '3', content: 'Can I substitute chicken with fish in the dinner recipes?', sender: 'client', time: '10:10 AM', is_read: true },
        { id: '4', content: 'Absolutely! Fish is a great alternative. It has similar protein content and is rich in omega-3 fatty acids. Just make sure to use similar portion sizes.', sender: 'nutritionist', time: '10:15 AM', is_read: true },
        { id: '5', content: 'Thanks for the meal plan!', sender: 'client', time: '10:30 AM', is_read: false },
      ])
      return
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data?.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender_id === user?.id ? 'nutritionist' : 'client',
        time: new Date(msg.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        is_read: msg.is_read
      })) || [])

      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return

    const newMessage = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'nutritionist',
      time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
      is_read: false
    }

    setMessages([...messages, newMessage])
    setMessageText('')

    if (!isSupabaseConfigured()) {
      return
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation.id,
          sender_id: user?.id,
          content: messageText
        }])

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.client_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Chat with your clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-80px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {conv.client_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{conv.client_name}</p>
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(conv.last_message_time)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conv.last_message}
                        </p>
                      </div>
                      {conv.unread > 0 && (
                        <Badge className="bg-primary">{conv.unread}</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {filteredConversations.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedConversation.client_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedConversation.client_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedConversation.client_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex ${message.sender === 'nutritionist' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === 'nutritionist'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${
                            message.sender === 'nutritionist'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}>
                            <span>{message.time}</span>
                            {message.sender === 'nutritionist' && (
                              message.is_read
                                ? <CheckCheck className="h-3 w-3" />
                                : <Check className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!messageText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">Select a conversation</h3>
                <p>Choose a client to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
