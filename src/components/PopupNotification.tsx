import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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

const PopupNotification = ({ userId }: Props) => {
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [showOk, setShowOk] = useState(false);
  const [timerRef, setTimerRef] = useState<ReturnType<typeof setTimeout> | null>(null);

  const showPopup = useCallback((notif: PopupData) => {
    setPopup(notif);
    setShowOk(false);
    const timer = setTimeout(() => setShowOk(true), 12000); // 12 seconds
    setTimerRef(timer);
  }, []);

  useEffect(() => {
    // Listen for new notifications in realtime
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
          // Show popup for task_assigned and broadcast types
          if (notif.type === "task_assigned" || notif.type === "broadcast") {
            showPopup({
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
      if (timerRef) clearTimeout(timerRef);
    };
  }, [userId, showPopup, timerRef]);

  const handleAccept = async () => {
    if (!popup) return;

    // If task_assigned, notify the assigner that the user accepted
    if (popup.type === "task_assigned" && popup.reference_id) {
      // Get the task to find who assigned it
      const { data: task } = await supabase
        .from("tasks")
        .select("assigned_by, title")
        .eq("id", popup.reference_id)
        .maybeSingle();

      if (task) {
        // Get acceptor's name
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

    // Mark notification as read
    await supabase.from("notifications").update({ is_read: true }).eq("id", popup.id);

    setPopup(null);
    setShowOk(false);
    if (timerRef) clearTimeout(timerRef);
  };

  if (!popup) return null;

  const icon = popup.type === "broadcast" ? "📢" : "📋";
  const title = popup.type === "broadcast" ? "ব্রডকাস্ট মেসেজ" : "নতুন টাস্ক অ্যাসাইন";

  return (
    <Dialog open={!!popup} onOpenChange={() => {}}>
      <DialogContent
        className="mx-4 sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-primary">
            {icon} {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center text-foreground whitespace-pre-wrap leading-relaxed">
          {popup.message || popup.title}
        </div>
        {showOk ? (
          <div className="flex justify-center">
            <Button onClick={handleAccept} size="lg" className="px-10 font-semibold">
              {popup.type === "task_assigned" ? "গ্রহণ করলাম" : "ঠিক আছে"}
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground animate-pulse">
            অপেক্ষা করুন...
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PopupNotification;
