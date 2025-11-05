"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Send,
  Search,
  MessageSquare,
  Clock,
  Check,
  CheckCheck,
  Paperclip,
  Smile
} from "lucide-react"

interface Message {
  id: string
  content: string
  messageType: string
  isRead: boolean
  createdAt: string
  sender: {
    id: string
    email: string
    role: string
    brandProfile?: {
      companyName: string
      logo?: string
    }
    influencerProfile?: {
      firstName: string
      lastName: string
      profileImage?: string
    }
  }
  receiver: {
    id: string
    email: string
    role: string
    brandProfile?: {
      companyName: string
      logo?: string
    }
    influencerProfile?: {
      firstName: string
      lastName: string
      profileImage?: string
    }
  }
}

interface Conversation {
  userId: string
  displayName: string
  avatar?: string
  lastMessage: string
  lastMessageTime: string
  isUnread: boolean
  role: string
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentUser = session?.user

  useEffect(() => {
    fetchConversations()
  }, [session])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation, session])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/messages")
      if (!response.ok) throw new Error("Failed to fetch messages")

      const allMessages: Message[] = await response.json()

      // Group messages by conversation
      const conversationsMap = new Map<string, Conversation>()

      allMessages.forEach(message => {
        const otherUser = message.sender.id === currentUser?.id ? message.receiver : message.sender

        if (!conversationsMap.has(otherUser.id)) {
          conversationsMap.set(otherUser.id, {
            userId: otherUser.id,
            displayName: getDisplayName(otherUser),
            avatar: getAvatar(otherUser),
            lastMessage: "",
            lastMessageTime: "",
            isUnread: false,
            role: otherUser.role
          })
        }

        const conversation = conversationsMap.get(otherUser.id)!

        // Update last message if this is more recent
        if (!conversation.lastMessageTime || new Date(message.createdAt) > new Date(conversation.lastMessageTime)) {
          conversation.lastMessage = message.content
          conversation.lastMessageTime = message.createdAt
          conversation.isUnread = message.receiver.id === currentUser?.id && !message.isRead
        }
      })

      // Convert to array and sort by last message time
      const conversationsArray = Array.from(conversationsMap.values()).sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      )

      setConversations(conversationsArray)
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (userId: string) => {
    try {
      const response = await fetch(`/api/messages?userId=${userId}`)
      if (!response.ok) throw new Error("Failed to fetch messages")

      const messages: Message[] = await response.json()
      // Sort messages by date (oldest first)
      const sortedMessages = messages.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      setMessages(sortedMessages)

      // Mark messages as read
      await markMessagesAsRead(userId)
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }

  const markMessagesAsRead = async (userId: string) => {
    try {
      // This would be implemented to mark messages as read
      // For now, we'll just update the local state
      setMessages(prev => prev.map(msg =>
        msg.receiver.id === currentUser?.id ? { ...msg, isRead: true } : msg
      ))
    } catch (error) {
      console.error("Error marking messages as read:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return

    setSendingMessage(true)
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedConversation,
          content: newMessage.trim(),
          messageType: "TEXT"
        }),
      })

      if (response.ok) {
        const newMsg = await response.json()
        setMessages(prev => [...prev, newMsg])
        setNewMessage("")
        fetchConversations() // Refresh conversations
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSendingMessage(false)
    }
  }

  const getDisplayName = (user: any) => {
    if (user.role === "BRAND" && user.brandProfile) {
      return user.brandProfile.companyName
    } else if (user.role === "INFLUENCER" && user.influencerProfile) {
      return `${user.influencerProfile.firstName} ${user.influencerProfile.lastName}`
    }
    return user.email
  }

  const getAvatar = (user: any) => {
    if (user.brandProfile?.logo) {
      return user.brandProfile.logo
    } else if (user.influencerProfile?.profileImage) {
      return user.influencerProfile.profileImage
    }
    return undefined
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Conversations List */}
      <div className="w-80 border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-8rem)]">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.userId}
                onClick={() => setSelectedConversation(conversation.userId)}
                className={`
                  flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer border-b
                  ${selectedConversation === conversation.userId ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
                `}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conversation.avatar} />
                  <AvatarFallback>
                    {conversation.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{conversation.displayName}</p>
                    <span className="text-xs text-gray-500">{formatTime(conversation.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                    {conversation.isUnread && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={conversations.find(c => c.userId === selectedConversation)?.avatar} />
                  <AvatarFallback>
                    {conversations.find(c => c.userId === selectedConversation)?.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {conversations.find(c => c.userId === selectedConversation)?.displayName}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {conversations.find(c => c.userId === selectedConversation)?.role}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isFromCurrentUser = message.sender.id === currentUser?.id

                return (
                  <div
                    key={message.id}
                    className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${isFromCurrentUser ? 'order-2' : 'order-1'}`}>
                      <div
                        className={`
                          px-4 py-2 rounded-lg
                          ${isFromCurrentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                          }
                        `}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className={`flex items-center space-x-1 mt-1 text-xs text-gray-500 ${isFromCurrentUser ? 'justify-end' : ''}`}>
                        <span>{formatTime(message.createdAt)}</span>
                        {isFromCurrentUser && (
                          <span>
                            {message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="resize-none"
                    rows={1}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Smile className="h-4 w-4" />
                  </Button>
                  <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}