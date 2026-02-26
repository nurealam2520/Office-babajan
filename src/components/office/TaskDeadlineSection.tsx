import { useEffect, useState, useCallback } from "react";
import { Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import TaskDetailDialog from "./TaskDetailDialog";

interface Props {
  userId: string;
  businessId: string | null;
}

const TaskDeadlineSection = ({ userId, businessId }: Props) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "overdue" | "upcoming">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("tasks").select("*").not("due_date", "is", null).neq("status", "completed").order("due_date", { ascending: true });
    if (businessId) query = query.eq("business_id", businessId);

    const [{ data: t }, { data: p }] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    setTasks(t || []);
    setProfiles(p || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfileName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || uid.slice(0, 8);

  const getTimeInfo = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) {
      const hrs = Math.abs(Math.floor(diff / 3600000));
      return { text: `${hrs} ঘণ্টা আগে শেষ`, overdue: true, percent: 100 };
    }
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    const text = days > 0 ? `${days}দি ${hrs % 24}ঘ বাকি` : `${hrs}ঘ বাকি`;
    return { text, overdue: false, percent: Math.min(90, 100 - (diff / (7 * 86400000)) * 100) };
  };

  const overdueTasks = tasks.filter(t => new Date(t.due_date).getTime() < Date.now());
  const upcomingTasks = tasks.filter(t => new Date(t.due_date).getTime() >= Date.now());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> ডেডলাইন ট্র্যাকার
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card
          className={`cursor-pointer transition-all ${deadlineFilter === "overdue" ? "ring-2 ring-destructive shadow-md" : "border-destructive/30 hover:shadow-md"}`}
          onClick={() => setDeadlineFilter(deadlineFilter === "overdue" ? "all" : "overdue")}
        >
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">সময় শেষ</p>
            <p className="text-2xl font-bold text-destructive">{overdueTasks.length}</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-all ${deadlineFilter === "upcoming" ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"}`}
          onClick={() => setDeadlineFilter(deadlineFilter === "upcoming" ? "all" : "upcoming")}
        >
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">আসন্ন</p>
            <p className="text-2xl font-bold text-primary">{upcomingTasks.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : tasks.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><Clock className="h-12 w-12" /><p>কোন ডেডলাইন নেই</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {(deadlineFilter === "overdue" ? overdueTasks : deadlineFilter === "upcoming" ? upcomingTasks : tasks).map(task => {
            const info = getTimeInfo(task.due_date);
            return (
              <Card
                key={task.id}
                className={`cursor-pointer hover:shadow-md transition-all ${info.overdue ? "border-destructive/50" : ""}`}
                onClick={() => setSelectedTask(task)}
              >
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{task.title}</p>
                    {info.overdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>👤 {getProfileName(task.assigned_to)}</span>
                    <span>📅 {new Date(task.due_date).toLocaleDateString("bn-BD")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={info.percent} className="h-1.5 flex-1" />
                    <span className={`text-[10px] ${info.overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>{info.text}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => { setSelectedTask(null); fetchData(); }}
          getProfileName={getProfileName}
          canEdit
        />
      )}
    </div>
  );
};

export default TaskDeadlineSection;
