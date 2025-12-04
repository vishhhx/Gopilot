import { axiosInstance } from "@/utils";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import ChatInput from "@/components/chat/ChatInput";
import ErrorState from "@/components/Other/common/ErrorState";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, User, Bot, Calendar, Tag, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// ... [Interfaces remain exactly the same] ...
interface DynamicContent {
  type: string;
  title: string;
  url: string | null;
  metadata: {
    emailId: string;
    threadId: string;
    from: string;
    to: string[];
    subject: string;
    date: string;
    snippet?: string;
    labels?: string[];
    hasAttachments?: boolean;
    operation: string;
  };
  data?: {
    body?: string;
    attachments?: any[];
  };
}

interface Message {
  messageId: string;
  sender: "user" | "agent" | "system";
  agentName?: string;
  content: string;
  isDynamic: boolean;
  dynamicContent?: DynamicContent[];
  timestamp: string;
  metadata?: any;
  isError?: boolean;
}

interface SessionData {
  _id: string;
  sessionId: string;
  conversation: Message[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

function SessionChat() {
  const { sessionId } = useParams();
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // 1. Use a ref specifically for the bottom of the list
  const bottomRef = useRef<HTMLDivElement>(null);

  const getSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await axiosInstance.get(`/session/${sessionId}`);
      setSession(data.data);
    } catch (err: any) {
      console.error("Error fetching session:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load chat session"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!sessionId) return;

    setSendError(null);

    const userMessage: Message = {
      messageId: Date.now().toString(),
      sender: "user",
      content: message,
      isDynamic: false,
      timestamp: new Date().toISOString(),
    };

    setSession((prev) =>
      prev
        ? {
            ...prev,
            conversation: [...prev.conversation, userMessage],
          }
        : null
    );

    try {
      setIsSending(true);
      const { data } = await axiosInstance.post(`/agent/chat/${sessionId}`, {
        message,
      });

      const result = data.data.result;

      const agentMessage: Message = {
        messageId: (Date.now() + 1).toString(),
        sender: "agent",
        agentName: "orchestrator",
        content:
          typeof result === "string"
            ? result
            : result.content || JSON.stringify(result),
        isDynamic: typeof result === "object" && result.isDynamic,
        dynamicContent:
          typeof result === "object" ? result.dynamicContent : undefined,
        timestamp: new Date().toISOString(),
      };

      setSession((prev) =>
        prev
          ? {
              ...prev,
              conversation: [...prev.conversation, agentMessage],
            }
          : null
      );
    } catch (err: any) {
      console.error("Error sending message:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send message";
      setSendError(errorMessage);

      const errorMsg: Message = {
        messageId: (Date.now() + 2).toString(),
        sender: "system",
        content: `Error: ${errorMessage}`,
        isDynamic: false,
        timestamp: new Date().toISOString(),
        isError: true,
      };

      setSession((prev) =>
        prev
          ? {
              ...prev,
              conversation: [...prev.conversation, errorMsg],
            }
          : null
      );
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    getSession();
  }, [sessionId]);

  // 2. Improved Auto-scroll logic
  // Simply scroll the "bottomRef" into view whenever conversation changes or loading starts
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [session?.conversation.length, isSending]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOperationColor = (operation: string) => {
    const colors: {
      [key: string]: "default" | "secondary" | "destructive" | "outline";
    } = {
      read: "default",
      sent: "secondary",
      deleted: "destructive",
      archived: "outline",
      trashed: "outline",
      forwarded: "secondary",
      replied: "secondary",
      marked_as_spam: "destructive",
    };
    return colors[operation] || "default";
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex-1 p-4 space-y-4 max-w-4xl mx-auto w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        type="default"
        title="Failed to Load Chat"
        description={error}
        onRetry={getSession}
        showRetryButton={true}
        fullHeight={true}
        centered={true}
      />
    );
  }

  if (!session) {
    return (
      <ErrorState
        type="notFound"
        title="Session Not Found"
        description="The chat session you're looking for doesn't exist or has been deleted."
        showRetryButton={false}
        fullHeight={true}
        centered={true}
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* 3. CHANGED: Use flex-1 instead of h-10/12 to perfectly fill available space */}
      <ScrollArea className="h-9/12 p-4">
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {sendError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          )}

          {session.conversation.map((msg) => (
            <div
              key={msg.messageId}
              className={`flex gap-3 ${
                msg.sender === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback
                  className={msg.isError ? "bg-destructive/10" : ""}
                >
                  {msg.sender === "user" ? (
                    <User className="h-5 w-5" />
                  ) : msg.isError ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div
                className={`flex-1 space-y-2 ${
                  msg.sender === "user" ? "items-end" : ""
                }`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : msg.isError
                      ? "bg-destructive/10 border border-destructive/20"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isError ? "text-destructive/70" : "opacity-70"
                    }`}
                  >
                    {formatDate(msg.timestamp)}
                  </p>
                </div>

                {msg.isDynamic && msg.dynamicContent && (
                  <div className="space-y-3 mt-3">
                    {msg.dynamicContent.map((item, idx) => (
                      <Card key={idx} className="max-w-[80%]">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate">
                                  {item.metadata.subject}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.metadata.from}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={getOperationColor(
                                item.metadata.operation
                              )}
                              className="flex-shrink-0"
                            >
                              {item.metadata.operation.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {item.metadata.snippet && (
                            <>
                              <p className="text-sm text-muted-foreground">
                                {item.metadata.snippet}
                              </p>
                              <Separator />
                            </>
                          )}

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{item.metadata.date}</span>
                            </div>

                            {item.metadata.labels &&
                              item.metadata.labels.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div className="flex flex-wrap gap-1">
                                    {item.metadata.labels.map((label) => (
                                      <Badge
                                        key={label}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {label}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback>
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. This invisible div anchors the scroll to the bottom */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isSending}
            disabled={!!error}
          />
        </div>
      </div>
    </div>
  );
}

export default SessionChat;
