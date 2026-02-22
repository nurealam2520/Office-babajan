import { useEffect, useState, useCallback, useRef } from "react";
import { Send, Mic, Image, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  otherUserId: string;
  otherUserName: string;
  hideHeader?: boolean;
}

const ChatView = ({ userId, otherUserId, otherUserName, hideHeader = false }: Props) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data || []);
    setLoading(false);
  }, [userId, otherUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${otherUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (
          (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === userId)
        ) {
          setMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, otherUserId]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendText = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: otherUserId,
      content: text.trim(),
      message_type: "text",
    });
    if (error) {
      toast({ title: "ত্রুটি", description: "মেসেজ পাঠাতে সমস্যা", variant: "destructive" });
    }
    setText("");
    setSending(false);
  };

  const uploadFile = async (file: Blob, ext: string): Promise<string | null> => {
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("message-media").upload(path, file);
    if (error) return null;
    const { data } = supabase.storage.from("message-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const sendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    const url = await uploadFile(file, file.name.split(".").pop() || "jpg");
    if (!url) {
      toast({ title: "ত্রুটি", description: "ছবি আপলোড ব্যর্থ", variant: "destructive" });
      setSending(false);
      return;
    }
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: otherUserId,
      content: "📷 ছবি",
      media_url: url,
      message_type: "image",
    });
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setSending(true);
        const url = await uploadFile(blob, "webm");
        if (!url) {
          toast({ title: "ত্রুটি", description: "ভয়েস আপলোড ব্যর্থ", variant: "destructive" });
          setSending(false);
          return;
        }
        await supabase.from("messages").insert({
          sender_id: userId,
          receiver_id: otherUserId,
          content: "🎤 ভয়েস মেসেজ",
          media_url: url,
          message_type: "voice",
        });
        setSending(false);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      toast({ title: "ত্রুটি", description: "মাইক্রোফোন অ্যাক্সেস দিন", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      {!hideHeader && (
        <div className="border-b px-3 py-2.5 bg-card">
          <h3 className="text-sm font-semibold text-foreground">{otherUserName}</h3>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">লোড হচ্ছে...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">কোন মেসেজ নেই। কথা শুরু করুন!</div>
        ) : (
          messages.map(msg => {
            const isMine = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 shadow-sm ${
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>
                  {msg.message_type === "image" && msg.media_url && (
                    <img src={msg.media_url} alt="ছবি" className="rounded-lg mb-1 max-w-full max-h-60 object-cover" />
                  )}
                  {msg.message_type === "voice" && msg.media_url && (
                    <audio controls src={msg.media_url} className="max-w-full" />
                  )}
                  {msg.message_type === "text" && (
                    <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <p className={`text-[9px] mt-0.5 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleString("bn-BD")}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={sendImage}
          />
          <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={sending}>
            <Image className="h-5 w-5" />
          </Button>

          {recording ? (
            <Button size="icon" variant="destructive" onClick={stopRecording}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="ghost" onClick={startRecording} disabled={sending}>
              <Mic className="h-5 w-5" />
            </Button>
          )}

          <Input
            placeholder="মেসেজ লিখুন..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendText()}
            disabled={sending || recording}
            className="flex-1"
          />
          <Button size="icon" onClick={sendText} disabled={!text.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {recording && (
          <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
            <span className="animate-pulse">●</span> রেকর্ডিং চলছে...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatView;
