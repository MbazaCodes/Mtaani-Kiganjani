import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Download,
  Loader2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ChatMessage {
  id: string;
  application_id: string;
  sender_id: string;
  message: string;
  attachments: { name: string; type: string; dataUrl: string; size: number }[];
  read: boolean;
  created_at: string;
  sender?: { first_name?: string; last_name?: string; role?: string };
}

interface ApplicationChatProps {
  applicationId: string;
  applicationNumber: string;
  applicantId: string; // the citizen who owns this application
  lang: string;
  /** Whether the chat starts expanded (default: false on mobile) */
  defaultExpanded?: boolean;
}

export const ApplicationChat: React.FC<ApplicationChatProps> = ({
  applicationId,
  applicationNumber,
  applicantId,
  lang,
  defaultExpanded = false,
}) => {
  const { user } = useAuth();
  const sw = lang === "sw";
  const L = (s: string, e: string) => (sw ? s : e);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<
    { name: string; type: string; dataUrl: string; size: number }[]
  >([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isStaff = user?.role === "staff" || user?.role === "admin";

  const fetchMessages = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("application_messages")
        .select(
          "*, sender:sender_id(first_name, last_name, role)",
        )
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });
      const msgs = (data || []) as ChatMessage[];
      setMessages(msgs);
      // Count unread for this user
      const unread = msgs.filter(
        (m) => !m.read && m.sender_id !== user?.id,
      ).length;
      setUnreadCount(unread);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [applicationId, user?.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, expanded]);

  // Mark messages as read when expanded
  useEffect(() => {
    if (!expanded || !user?.id || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => !m.read && m.sender_id !== user.id)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    void supabase
      .from("application_messages")
      .update({ read: true })
      .in("id", unreadIds)
      .then(() => {
        setMessages((prev) =>
          prev.map((m) =>
            unreadIds.includes(m.id) ? { ...m, read: true } : m,
          ),
        );
        setUnreadCount(0);
      });
  }, [expanded, messages, user?.id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 3_000_000) continue; // max 3MB
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      setAttachments((prev) =>
        [...prev, { name: file.name, type: file.type, dataUrl, size: file.size }].slice(0, 3),
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSend = async () => {
    if (!user?.id || (!text.trim() && attachments.length === 0)) return;
    setSending(true);
    try {
      await supabase.from("application_messages").insert({
        application_id: applicationId,
        sender_id: user.id,
        message: text.trim(),
        attachments: attachments.length > 0 ? attachments : [],
      });

      // Notify the other party
      const recipientId = isStaff ? applicantId : null; // staff → citizen
      if (recipientId) {
        await supabase.from("notifications").insert({
          user_id: recipientId,
          title: sw ? "Ujumbe Mpya kwenye Maombi" : "New Message on Application",
          message: `${applicationNumber}: ${text.trim().slice(0, 80)}${text.trim().length > 80 ? "..." : ""}`,
          type: "application",
        });
      }
      // If citizen replying, notify the staff who last messaged (or area staff)
      if (!isStaff) {
        const lastStaffMsg = [...messages].reverse().find(
          (m) => m.sender?.role === "staff" || m.sender?.role === "admin",
        );
        if (lastStaffMsg) {
          await supabase.from("notifications").insert({
            user_id: lastStaffMsg.sender_id,
            title: sw ? "Jibu la Raia kwenye Maombi" : "Citizen Reply on Application",
            message: `${applicationNumber}: ${text.trim().slice(0, 80)}`,
            type: "application",
          });
        }
      }

      setText("");
      setAttachments([]);
      await fetchMessages();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const senderName = (m: ChatMessage) => {
    const s = m.sender;
    if (!s) return m.sender_id === user?.id ? L("Wewe", "You") : "?";
    const name = `${s.first_name || ""} ${s.last_name || ""}`.trim();
    if (m.sender_id === user?.id) return L("Wewe", "You");
    return name || (s.role === "staff" ? L("Afisa", "Officer") : L("Raia", "Citizen"));
  };

  const isMe = (m: ChatMessage) => m.sender_id === user?.id;

  return (
    <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
      {/* Header — tap to expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-emerald-600" />
          <span className="text-xs font-black text-stone-700 uppercase tracking-wider">
            {L("Mazungumzo ya Maombi", "Application Chat")}
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
          {messages.length > 0 && (
            <span className="text-[10px] text-stone-400">({messages.length})</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-stone-400" />
        ) : (
          <ChevronDown size={16} className="text-stone-400" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col" style={{ maxHeight: 360 }}>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
            style={{ maxHeight: 240, minHeight: 60 }}
          >
            {loading ? (
              <div className="text-center py-4">
                <Loader2 size={18} className="animate-spin mx-auto text-stone-300" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-xs text-stone-400 py-4">
                {L("Hakuna mazungumzo bado", "No messages yet")}
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${isMe(m) ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                      isMe(m)
                        ? "bg-emerald-600 text-white rounded-br-sm"
                        : "bg-stone-100 text-stone-800 rounded-bl-sm"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-bold mb-0.5 ${isMe(m) ? "text-emerald-100" : "text-stone-500"}`}
                    >
                      {senderName(m)} ·{" "}
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {m.message && (
                      <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    )}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {m.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.dataUrl}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 ${
                              isMe(m)
                                ? "bg-emerald-700 text-emerald-100 hover:bg-emerald-800"
                                : "bg-stone-200 text-stone-700 hover:bg-stone-300"
                            }`}
                          >
                            {att.type?.startsWith("image/") ? (
                              <img
                                src={att.dataUrl}
                                alt={att.name}
                                className="w-6 h-6 rounded object-cover"
                              />
                            ) : (
                              <FileText size={12} />
                            )}
                            <span className="truncate flex-1">{att.name}</span>
                            <Download size={10} className="shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="px-3 py-1.5 border-t border-stone-100 flex gap-2 overflow-x-auto">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 bg-stone-50 rounded-lg px-2 py-1 text-[10px] shrink-0"
                >
                  <span className="truncate max-w-[80px]">{att.name}</span>
                  <button
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="text-stone-400 hover:text-red-500"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-stone-200 px-3 py-2 flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={attachments.length >= 3}
              className="p-2 text-stone-400 hover:text-emerald-600 disabled:opacity-30"
              title={L("Ambatisha faili", "Attach file")}
            >
              <Paperclip size={18} />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isStaff
                  ? L("Uliza raia au omba hati...", "Ask citizen or request docs...")
                  : L("Jibu au pakia hati...", "Reply or upload docs...")
              }
              className="flex-1 text-sm bg-stone-50 rounded-xl px-3 py-2 border border-stone-200 focus:border-emerald-300 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || (!text.trim() && attachments.length === 0)}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-40"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
