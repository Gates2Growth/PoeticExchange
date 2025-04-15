import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Message, InsertMessage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function useChat(otherUserId?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  
  // Fetch message history
  const { data: fetchedMessages, isLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${otherUserId}`],
    enabled: !!user && !!otherUserId,
    onSuccess: (data) => {
      setMessages(data);
    },
  });

  // Set up WebSocket connection
  useEffect(() => {
    if (!user || !otherUserId) return;
    
    // Clean up previous connection
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Create new connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    setConnectionStatus("connecting");
    
    socket.onopen = () => {
      setConnectionStatus("connected");
      
      // Authenticate after connection
      socket.send(JSON.stringify({
        type: "auth",
        userId: user.id
      }));
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "message") {
          // Add new message to state
          setMessages(prev => [...prev, data.message]);
          
          // If the message is from the chat partner, mark it as read
          if (data.message.senderId === otherUserId) {
            socket.send(JSON.stringify({
              type: "mark_read",
              senderId: otherUserId
            }));
            
            // Also update the API
            markMessagesAsRead(otherUserId);
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    socket.onclose = () => {
      setConnectionStatus("disconnected");
    };
    
    socket.onerror = (error) => {
      setConnectionStatus("disconnected");
      toast({
        title: "Connection Error",
        description: "Failed to connect to chat server. Please try again later.",
        variant: "destructive",
      });
      console.error("WebSocket error:", error);
    };
    
    return () => {
      socket.close();
    };
  }, [user, otherUserId, toast]);
  
  // Function to send a message
  const sendMessage = useCallback(async (messageData: Omit<InsertMessage, "senderId">) => {
    if (!user || !otherUserId) {
      throw new Error("Cannot send message: Missing user or recipient");
    }
    
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      throw new Error("Cannot send message: Connection not open");
    }
    
    // Send via WebSocket for real-time delivery
    socketRef.current.send(JSON.stringify({
      type: "message",
      senderId: user.id,
      receiverId: otherUserId,
      content: messageData.content,
      imageData: messageData.imageData
    }));
    
    return true;
  }, [user, otherUserId]);
  
  // Function to mark messages as read
  const markMessagesAsRead = useCallback(async (senderId: number) => {
    if (!user) return;
    
    try {
      await apiRequest("POST", `/api/messages/read/${senderId}`, {
        receiverId: user.id
      });
      
      // Update local state to mark messages as read
      setMessages(prev => 
        prev.map(msg => 
          msg.senderId === senderId && !msg.isRead
            ? { ...msg, isRead: true }
            : msg
        )
      );
      
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${otherUserId}`] });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [user, otherUserId]);
  
  return {
    messages,
    isLoading,
    sendMessage,
    markMessagesAsRead,
    connectionStatus
  };
}
