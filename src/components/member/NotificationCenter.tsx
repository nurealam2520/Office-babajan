import { useEffect, useState, useCallback } from "react";
import { Bell, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

interface Props {
  userId: string;
}

const typeLabels: Record<string, { icon: string; label: string }> = {
  task_assigned: { icon: "📋", label: "টাস্ক" },
  report_submitted: { icon: "📄", label: "রিপোর্ট" },
  broadcast: { icon: "📢", label: "ব্রডকাস্ট" },
  task_resubmit: { icon: "🔄", label: "রি-টাস্ক" },
};

const NotificationCenter = ({ userId }: Props) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel(`notif-center-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchNotifications]);

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    fetchNotifications();
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "এইমাত্র";
    if (mins < 60) return `${mins}মি আগে`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}ঘ আগে`;
    return `${Math.floor(hrs / 24)}দি আগে`;
  };

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);
  const filterTypes = ["all", ...new Set(notifications.map(n => n.type))];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">নোটিফিকেশন</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              সব পড়া হয়েছে
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {filterTypes.map(type => (
            <Button
              key={type}
              size="sm"
              variant={filter === type ? "default" : "ghost"}
              className="h-6 text-[10px] px-2 shrink-0"
              onClick={() => setFilter(type)}
            >
              {type === "all" ? "সব" : typeLabels[type]?.label || type}
            </Button>
          ))}
        </div>

        <ScrollArea className="max-h-80">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">কোন নোটিফিকেশন নেই</div>
          ) : (
            filtered.map(n => (
              <div key={n.id} className={`flex gap-3 border-b px-4 py-3 text-sm ${!n.is_read ? "bg-primary/5" : ""}`}>
                <span className="text-lg">{typeLabels[n.type]?.icon || "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
