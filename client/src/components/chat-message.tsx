import { User, Message } from "@shared/schema";
import { cn, formatDate, getUserInitial, getTimeString } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  currentUser: User;
  otherUser: User;
  isNew?: boolean;
}

export function ChatMessage({ message, currentUser, otherUser, isNew = false }: ChatMessageProps) {
  const isCurrentUserMessage = message.senderId === currentUser.id;
  const messageUser = isCurrentUserMessage ? currentUser : otherUser;
  
  return (
    <div className={cn(
      "flex items-start", 
      isCurrentUserMessage ? "justify-end" : ""
    )}>
      {!isCurrentUserMessage && (
        <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2 flex-shrink-0">
          <span className="text-xs font-medium">{getUserInitial(messageUser.displayName)}</span>
        </div>
      )}
      <div className={cn("max-w-[75%]", isCurrentUserMessage ? "text-right" : "")}>
        {message.imageData ? (
          <div className={cn(
            "rounded-lg overflow-hidden",
            isCurrentUserMessage ? "bg-primary text-white" : "bg-gray-100"
          )}>
            <img src={message.imageData} alt="Shared image" className="w-full h-48 object-cover" />
            {message.content && (
              <div className={cn(
                "px-3 py-2 text-sm",
                isCurrentUserMessage ? "text-white" : "text-darktext"
              )}>
                {message.content}
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isCurrentUserMessage ? "bg-primary text-white" : "bg-gray-100 text-darktext"
          )}>
            {message.content}
          </div>
        )}
        <div className={cn(
          "text-xs text-gray-500 mt-1",
          isCurrentUserMessage ? "text-right" : ""
        )}>
          {getTimeString(message.createdAt)}
          {isNew && <span className="ml-1 text-primary">• New</span>}
        </div>
      </div>
    </div>
  );
}

export function DateDivider({ date }: { date: Date | string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
        {formatDate(date, "MMMM d, yyyy")}
      </div>
    </div>
  );
}
