import { useEffect, useState, useCallback } from "react";
import { CalendarDays, RefreshCw, Clock, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import TaskDetailDialog from "./TaskDetailDialog";

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
  const [statsFilter, setStatsFilter] = useState<"none" | "total" | "overdue" | "completed">("none");
  const [selectedTask, setSelectedTask] = useState<any>(null);

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
    const p = profiles.find(pr => pr.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const selectedDateStr = selectedDate?.toISOString().split("T")[0];
  const tasksOnDate = tasks.filter(t => t.due_date && t.due_date.split("T")[0] === selectedDateStr);
  const createdOnDate = allTasks.filter(t => !t.due_date && t.created_at.split("T")[0] === selectedDateStr);
  const allOnDate = [...tasksOnDate, ...createdOnDate];

  const taskDates = new Set(tasks.map(t => new Date(t.due_date).toISOString().split("T")[0]));
  const modifiers = { hasTask: (date: Date) => taskDates.has(date.toISOString().split("T")[0]) };
  const modifiersStyles = { hasTask: { backgroundColor: "hsl(var(--primary) / 0.15)", borderRadius: "50%" } };

  const getTimeInfo = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return { overdue: true, text: "সময় শেষ" };
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    return { overdue: false, text: days > 0 ? `${days}দি ${hrs % 24}ঘ বাকি` : `${hrs}ঘ বাকি` };
  };

  const totalWithDue = allTasks.length;
  const overdue = allTasks.filter(t => t.status !== "completed" && t.due_date && new Date(t.due_date).getTime() < Date.now()).length;
  const completed = allTasks.filter(t => t.status === "completed").length;

  const getFilteredTasks = () => {
    if (statsFilter === "total") return allTasks;
    if (statsFilter === "overdue") return allTasks.filter(t => t.status !== "completed" && t.due_date && new Date(t.due_date).getTime() < Date.now());
    if (statsFilter === "completed") return allTasks.filter(t => t.status === "completed");
    return [];
  };
  const filteredTasks = getFilteredTasks();

  const handleStatsClick = (filter: "total" | "overdue" | "completed") => {
    setStatsFilter(statsFilter === filter ? "none" : filter);
  };

  const renderTaskCard = (task: any) => {
    const timeInfo = task.due_date ? getTimeInfo(task.due_date) : null;
    return (
      <Card
        key={task.id}
        className={`cursor-pointer hover:shadow-md transition-all ${timeInfo?.overdue && task.status !== "completed" ? "border-destructive/40" : ""}`}
        onClick={() => setSelectedTask(task)}
      >
        <CardContent className="py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{task.title}</p>
            <Badge variant={statusMap[task.status]?.variant || "secondary"} className="text-[10px]">
              {statusMap[task.status]?.label || task.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">👤 {getProfileName(task.assigned_to)}</p>
          {task.description && <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>}
          {task.due_date && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>📅 {new Date(task.due_date).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}</span>
              {timeInfo && task.status !== "completed" && (
                <span className={timeInfo.overdue ? "text-destructive font-medium" : ""}>{timeInfo.text}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

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

      {/* Clickable Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card
          className={`cursor-pointer transition-all ${statsFilter === "total" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => handleStatsClick("total")}
        >
          <CardContent className="py-2 text-center">
            <p className="text-[10px] text-muted-foreground">মোট</p>
            <p className="text-xl font-bold text-foreground">{totalWithDue}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statsFilter === "overdue" ? "ring-2 ring-destructive" : overdue > 0 ? "border-destructive/30 hover:shadow-md" : "hover:shadow-md"}`}
          onClick={() => handleStatsClick("overdue")}
        >
          <CardContent className="py-2 text-center">
            <p className="text-[10px] text-muted-foreground">ওভারডিউ</p>
            <p className={`text-xl font-bold ${overdue > 0 ? "text-destructive" : "text-foreground"}`}>{overdue}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${statsFilter === "completed" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => handleStatsClick("completed")}
        >
          <CardContent className="py-2 text-center">
            <p className="text-[10px] text-muted-foreground">সম্পন্ন</p>
            <p className="text-xl font-bold text-primary">{completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtered task list */}
      {statsFilter !== "none" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {statsFilter === "total" && `সকল টাস্ক (${filteredTasks.length})`}
              {statsFilter === "overdue" && `ওভারডিউ (${filteredTasks.length})`}
              {statsFilter === "completed" && `সম্পন্ন (${filteredTasks.length})`}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setStatsFilter("none")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {filteredTasks.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">কোন টাস্ক নেই</CardContent></Card>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">{filteredTasks.map(renderTaskCard)}</div>
          )}
        </div>
      )}

      {/* Calendar + Date tasks */}
      {statsFilter === "none" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-2 sm:p-3 flex justify-center">
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
              {selectedDate ? new Date(selectedDate).toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long" }) : "তারিখ সিলেক্ট করুন"}
              {allOnDate.length > 0 && <span className="ml-1 text-foreground font-semibold">({allOnDate.length})</span>}
            </h3>
            {loading ? (
              <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
            ) : allOnDate.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">এই তারিখে কোন টাস্ক নেই</CardContent></Card>
            ) : (
              <div className="space-y-2">{allOnDate.map(renderTaskCard)}</div>
            )}
          </div>
        </div>
      )}

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => { setSelectedTask(null); fetchData(); }}
          getProfileName={getProfileName}
          canEdit
          canDelete
        />
      )}
    </div>
  );
};

export default TaskCalendarSection;
