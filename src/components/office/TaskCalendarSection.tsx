import { useEffect, useState, useCallback } from "react";
import { CalendarDays, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  businessId: string | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  in_progress: { label: "চলছে", variant: "default" },
  completed: { label: "সম্পন্ন", variant: "outline" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive" },
};

const TaskCalendarSection = ({ userId, businessId }: Props) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("tasks").select("*").order("due_date", { ascending: true });
    if (businessId) query = query.eq("business_id", businessId);

    const [{ data: t }, { data: p }] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    const allT = t || [];
    setAllTasks(allT);
    setTasks(allT.filter(task => task.due_date));
    setProfiles(p || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const selectedDateStr = selectedDate?.toISOString().split("T")[0];
  const tasksOnDate = tasks.filter(t => t.due_date && t.due_date.split("T")[0] === selectedDateStr);
  // Also show tasks created on the selected date (no due_date)
  const createdOnDate = allTasks.filter(t => !t.due_date && t.created_at.split("T")[0] === selectedDateStr);
  const allOnDate = [...tasksOnDate, ...createdOnDate];

  // Dates with tasks for highlighting
  const taskDates = new Set(tasks.map(t => new Date(t.due_date).toISOString().split("T")[0]));
  const modifiers = {
    hasTask: (date: Date) => taskDates.has(date.toISOString().split("T")[0]),
  };
  const modifiersStyles = {
    hasTask: { backgroundColor: "hsl(var(--primary) / 0.15)", borderRadius: "50%" },
  };

  const getTimeInfo = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return { overdue: true, text: "সময় শেষ" };
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    return { overdue: false, text: days > 0 ? `${days}দি ${hrs % 24}ঘ বাকি` : `${hrs}ঘ বাকি` };
  };

  // Summary stats
  const totalWithDue = tasks.length;
  const overdue = tasks.filter(t => t.status !== "completed" && new Date(t.due_date).getTime() < Date.now()).length;
  const completed = tasks.filter(t => t.status === "completed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> টাস্ক ক্যালেন্ডার
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">মোট টাস্ক</p>
            <p className="text-xl font-bold text-foreground">{totalWithDue}</p>
          </CardContent>
        </Card>
        <Card className={overdue > 0 ? "border-destructive/30" : ""}>
          <CardContent className="py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">ওভারডিউ</p>
            <p className={`text-xl font-bold ${overdue > 0 ? "text-destructive" : "text-foreground"}`}>{overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">সম্পন্ন</p>
            <p className="text-xl font-bold text-primary">{completed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-3 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {selectedDate ? new Date(selectedDate).toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "তারিখ সিলেক্ট করুন"}
            {allOnDate.length > 0 && <span className="ml-1 text-foreground font-semibold">({allOnDate.length})</span>}
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
          ) : allOnDate.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                এই তারিখে কোন টাস্ক নেই
              </CardContent>
            </Card>
          ) : (
            allOnDate.map(task => {
              const timeInfo = task.due_date ? getTimeInfo(task.due_date) : null;
              return (
                <Card key={task.id} className={timeInfo?.overdue && task.status !== "completed" ? "border-destructive/40" : ""}>
                  <CardContent className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge variant={statusMap[task.status]?.variant || "secondary"} className="text-[10px]">
                        {statusMap[task.status]?.label || task.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">👤 {getProfileName(task.assigned_to)}</p>
                    {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                    {timeInfo && task.status !== "completed" && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {timeInfo.overdue ? (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        ) : (
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className={timeInfo.overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {timeInfo.text}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCalendarSection;
