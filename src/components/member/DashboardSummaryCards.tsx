import { useEffect, useState, useCallback } from "react";
import { ClipboardList, AlertTriangle, CalendarCheck, Wallet, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  businessId: string | null;
  onNavigate?: (tab: string) => void;
  isOffice?: boolean;
}

const DashboardSummaryCards = ({ userId, businessId, onNavigate, isOffice }: Props) => {
  const [stats, setStats] = useState({
    activeTasks: 0,
    overdueTasks: 0,
    todayAttendance: false,
    todayCollection: 0,
    pendingReports: 0,
  });

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch all in parallel
    const [tasksRes, attendanceRes, collectionRes, reportsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, due_date, status")
        .eq("assigned_to", userId)
        .neq("status", "completed")
        .then(r => r.data || []),
      supabase
        .from("attendance")
        .select("id")
        .eq("user_id", userId)
        .gte("created_at", today)
        .limit(1)
        .then(r => r.data || []),
      supabase
        .from("collections")
        .select("amount")
        .eq("user_id", userId)
        .eq("collection_date", today)
        .then(r => r.data || []),
      supabase
        .from("task_reports")
        .select("id, status")
        .eq("submitted_by", userId)
        .eq("status", "pending")
        .then(r => r.data || []),
    ]);

    const filteredTasks = businessId
      ? tasksRes.filter((t: any) => t.business_id === businessId)
      : tasksRes;

    setStats({
      activeTasks: filteredTasks.length,
      overdueTasks: filteredTasks.filter((t: any) => t.due_date && new Date(t.due_date).getTime() < Date.now()).length,
      todayAttendance: attendanceRes.length > 0,
      todayCollection: collectionRes.reduce((s: number, c: any) => s + parseFloat(c.amount), 0),
      pendingReports: reportsRes.length,
    });
  }, [userId, businessId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const cards = [
    {
      label: "সক্রিয় টাস্ক",
      value: stats.activeTasks,
      icon: ClipboardList,
      color: "text-primary",
      bg: "bg-primary/10",
      tab: "tasks",
    },
    {
      label: "ওভারডিউ",
      value: stats.overdueTasks,
      icon: AlertTriangle,
      color: stats.overdueTasks > 0 ? "text-destructive" : "text-muted-foreground",
      bg: stats.overdueTasks > 0 ? "bg-destructive/10" : "bg-muted",
      tab: "tasks",
    },
    {
      label: "আজকের হাজিরা",
      value: stats.todayAttendance ? "✅" : "❌",
      icon: CalendarCheck,
      color: stats.todayAttendance ? "text-primary" : "text-muted-foreground",
      bg: stats.todayAttendance ? "bg-primary/10" : "bg-muted",
      tab: "attendance",
    },
    ...(!isOffice ? [{
      label: "আজকের কালেকশন",
      value: `৳${stats.todayCollection.toLocaleString("bn-BD")}`,
      icon: Wallet,
      color: "text-primary",
      bg: "bg-primary/10",
      tab: "collection",
    }] : []),
    {
      label: "পেন্ডিং রিপোর্ট",
      value: stats.pendingReports,
      icon: FileText,
      color: stats.pendingReports > 0 ? "text-amber-600" : "text-muted-foreground",
      bg: stats.pendingReports > 0 ? "bg-amber-500/10" : "bg-muted",
      tab: "reports",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
          onClick={() => onNavigate?.(card.tab)}
        >
          <CardContent className="p-4 flex flex-col items-center text-center gap-1.5">
            <div className={`h-9 w-9 rounded-full ${card.bg} flex items-center justify-center`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <span className={`text-xl font-bold ${card.color}`}>{card.value}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{card.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardSummaryCards;
