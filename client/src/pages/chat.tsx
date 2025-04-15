import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { MainLayout } from "@/components/main-layout";
import { ChatMessage, DateDivider } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBase64 } from "@/lib/utils";

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Get friend's user info (in a real app, would fetch from API)
  const { data: friendUser } = useQuery<User>({
    queryKey: ["/api/friend"],
    queryFn: async () => {
      // Mock response for the friend user based on current user's ID
      return {
        id: user!.id === 1 ? 2 : 1,
        username: user!.id === 1 ? "sarah" : "emma",
        displayName: user!.id === 1 ? "Sarah" : "Emma",
        password: "" // Password is never exposed to the client
      };
    },
    enabled: !!user
  });

  const { 
    messages, 
    sendMessage, 
    markMessagesAsRead,
    connectionStatus
  } = useChat(friendUser?.id);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark messages as read when the chat component mounts
    if (friendUser?.id) {
      markMessagesAsRead(friendUser.id);
    }
  }, [friendUser?.id, markMessagesAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !imageFile) || !friendUser) return;
    
    setIsSending(true);
    try {
      let imageData = null;
      if (imageFile) {
        imageData = await getBase64(imageFile);
      }
      
      await sendMessage({
        content: messageText,
        receiverId: friendUser.id,
        imageData
      });
      
      setMessageText("");
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const cancelImageUpload = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resizeTextarea = () => {
    if (!textareaRef.current) return;
    
    // Reset height to auto to get the correct scrollHeight
    textareaRef.current.style.height = "auto";
    // Set the height to scrollHeight to fit the content
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  };

  // Group messages by date
  const messagesByDate = messages.reduce<Record<string, typeof messages>>((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Check for connection status
  if (!user || !friendUser) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-semibold text-darktext">
            Chat with {friendUser.displayName}
          </h1>
          
          {connectionStatus === "connecting" && (
            <div className="text-sm text-amber-500 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting...
            </div>
          )}
          
          {connectionStatus === "disconnected" && (
            <div className="text-sm text-red-500 flex items-center gap-2">
              <span className="h-2 w-2 bg-red-500 rounded-full"></span>
              Disconnected
            </div>
          )}
          
          {connectionStatus === "connected" && (
            <div className="text-sm text-green-500 flex items-center gap-2">
              <span className="h-2 w-2 bg-green-500 rounded-full"></span>
              Connected
            </div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          {/* Chat History */}
          <div className="flex-1 p-4 overflow-y-auto scrollbar-thin" id="chat-messages">
            <div className="space-y-4">
              {Object.entries(messagesByDate).map(([date, dateMessages]) => (
                <div key={date}>
                  <DateDivider date={date} />
                  
                  <div className="space-y-4 mt-4">
                    {dateMessages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        currentUser={user}
                        otherUser={friendUser}
                        isNew={!message.isRead && message.senderId !== user.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="px-4 py-2 text-xs text-primary italic">
                  {friendUser.displayName} is typing...
                </div>
              )}
              
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Image preview if selected */}
          {imagePreview && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Upload preview" 
                  className="h-20 rounded-md object-cover"
                />
                <button 
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-5 h-5 flex items-center justify-center text-xs"
                  onClick={cancelImageUpload}
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-end">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleImageClick}
                className="text-gray-500 hover:text-primary mr-2"
              >
                <Image className="h-5 w-5" />
              </Button>
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Type a message..."
                  className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary pr-10 resize-none min-h-[60px] max-h-32"
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    resizeTextarea();
                  }}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 bottom-2 text-primary hover:text-blue-700"
                  onClick={handleSendMessage}
                  disabled={isSending || (!messageText.trim() && !imageFile)}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
