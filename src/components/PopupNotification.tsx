import { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, ClipboardList, Volume2 } from "lucide-react";

interface Props {
  userId: string;
}

interface PopupData {
  id: string;
  type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
}

const extractAudioUrl = (message: string | null): { text: string; audioUrl: string | null } => {
  if (!message) return { text: "", audioUrl: null };
  const match = message.match(/\[audio\](.*?)\[\/audio\]/);
  if (match) {
    const audioUrl = match[1];
    const text = message.replace(/\[audio\].*?\[\/audio\]/, "").trim();
    return { text, audioUrl };
  }
  return { text: message, audioUrl: null };
};

const PopupNotification = ({ userId }: Props) => {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [showOk, setShowOk] = useState(false);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<PopupData[]>([]);
  const showingRef = useRef(false);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      showingRef.current = false;
      return;
    }
    showingRef.current = true;
    const next = queueRef.current.shift()!;
    setPopup(next);
    setShowOk(false);
    const timer = setTimeout(() => setShowOk(true), 12000);
    setTimerRef(timer);
  }, []);

  const enqueue = useCallback((notif: PopupData) => {
    queueRef.current.push(notif);
    if (!showingRef.current) {
      showNext();
    }
  }, [showNext]);

  // Fetch unread notifications on mount
  useEffect(() => {
    const fetchUnread = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, reference_id")
        .eq("user_id", userId)
        .eq("is_read", false)
        .in("type", ["task_assigned", "broadcast"])
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        data.forEach((notif) => enqueue(notif));
      }
    };
    fetchUnread();
  }, [userId, enqueue]);

  // Listen for new notifications in realtime
  useEffect(() => {
    const channel = supabase
      .channel(`popup-notif-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as any;
          if (notif.type === "task_assigned" || notif.type === "broadcast") {
            enqueue({
              id: notif.id,
              type: notif.type,
              title: notif.title,
              message: notif.message,
              reference_id: notif.reference_id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enqueue]);

  // Listen for replay events from NotificationCenter
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const notif = e.detail as PopupData;
      enqueue(notif);
    };
    window.addEventListener("replay-popup" as any, handler);
    return () => window.removeEventListener("replay-popup" as any, handler);
  }, [enqueue]);

  const handleAccept = async () => {
    if (!popup) return;

    if (popup.type === "task_assigned" && popup.reference_id) {
      // Update task status to in_progress
      await supabase.from("tasks").update({ status: "in_progress" }).eq("id", popup.reference_id);

      const { data: task } = await supabase
        .from("tasks")
        .select("assigned_by, title")
        .eq("id", popup.reference_id)
        .maybeSingle();

      if (task) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", userId)
          .maybeSingle();

        const name = profile?.full_name || "একজন ইউজার";

        await supabase.from("notifications").insert({
          user_id: task.assigned_by,
          title: "টাস্ক গ্রহণ",
          message: `${name} "${task.title}" টাস্ক গ্রহণ করেছেন`,
          type: "task_accepted",
          reference_id: popup.reference_id,
        });
      }
    }

    await supabase.from("notifications").update({ is_read: true }).eq("id", popup.id);

    setPopup(null);
    setShowOk(false);
    if (timerRef) clearTimeout(timerRef);
    showNext();
  };

  if (!popup) return null;

  const isBroadcast = popup.type === "broadcast";
  const { text: displayText, audioUrl } = extractAudioUrl(popup.message);
  const finalText = displayText || popup.title;

  return (
    <Dialog open={!!popup} onOpenChange={() => {}}>
      <DialogContent
        className="mx-4 sm:max-w-md p-0 overflow-hidden [&>button]:hidden rounded-2xl border-2 border-primary/20"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Colored top bar */}
        <div className={`px-6 pt-5 pb-4 ${isBroadcast ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" : "bg-gradient-to-br from-accent/10 via-accent/5 to-transparent"}`}>
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center ${isBroadcast ? "bg-primary/15" : "bg-accent/15"}`}>
                {isBroadcast ? (
                  <Megaphone className="h-7 w-7 text-primary" />
                ) : (
                  <ClipboardList className="h-7 w-7 text-accent-foreground" />
                )}
              </div>
            </div>
            <DialogTitle className="text-center text-lg text-foreground">
              {isBroadcast ? "ব্রডকাস্ট মেসেজ" : "নতুন টাস্ক অ্যাসাইন"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isBroadcast ? "ব্রডকাস্ট মেসেজ" : "নতুন টাস্ক অ্যাসাইন"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          <div className="text-center text-foreground whitespace-pre-wrap leading-relaxed text-sm">
            {finalText}
          </div>

          {/* Audio player for voice broadcasts */}
          {audioUrl && (
            <div className="flex items-center gap-2 rounded-xl bg-muted/80 p-3">
              <Volume2 className="h-5 w-5 text-primary shrink-0" />
              <audio controls src={audioUrl} className="w-full h-9" />
            </div>
          )}

          {/* Action button or waiting text */}
          {showOk ? (
            <div className="flex justify-center pt-1">
              <Button
                onClick={handleAccept}
                size="lg"
                className="px-10 font-semibold rounded-xl shadow-md"
              >
                {popup.type === "task_assigned" ? "গ্রহণ করলাম" : "ঠিক আছে"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">
                অপেক্ষা করুন...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupNotification;
