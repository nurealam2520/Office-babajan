import { useEffect, useState, useCallback } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import TaskDetailDialog from "./TaskDetailDialog";

interface Props {
  userId: string;
  businessId: string | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary", color: "bg-yellow-500" },
  in_progress: { label: "কাজ চলছে", variant: "default", color: "bg-blue-500" },
  completed: { label: "সম্পন্ন", variant: "outline", color: "bg-green-500" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive", color: "bg-red-500" },
};

const TaskStatusSection = ({ userId, businessId }: Props) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("tasks").select("*").order("updated_at", { ascending: false });
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

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    resubmit: tasks.filter(t => t.status === "resubmit").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" /> টাস্ক স্ট্যাটাস
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter chips - responsive */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "all", label: "সব" },
          { key: "pending", label: "অপেক্ষমাণ" },
          { key: "in_progress", label: "চলছে" },
          { key: "completed", label: "সম্পন্ন" },
          { key: "resubmit", label: "পুনরায়" },
        ].map(f => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            className="text-xs h-7 px-2"
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({counts[f.key as keyof typeof counts]})
          </Button>
        ))}
      </div>

      {/* Stats bar */}
      {tasks.length > 0 && (
        <div className="flex h-3 rounded-full overflow-hidden">
          {counts.completed > 0 && <div className="bg-green-500" style={{ width: `${(counts.completed / tasks.length) * 100}%` }} />}
          {counts.in_progress > 0 && <div className="bg-blue-500" style={{ width: `${(counts.in_progress / tasks.length) * 100}%` }} />}
          {counts.pending > 0 && <div className="bg-yellow-500" style={{ width: `${(counts.pending / tasks.length) * 100}%` }} />}
          {counts.resubmit > 0 && <div className="bg-red-500" style={{ width: `${(counts.resubmit / tasks.length) * 100}%` }} />}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><FileText className="h-12 w-12" /><p>কোন টাস্ক নেই</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <Card key={task.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedTask(task)}>
              <CardContent className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate flex-1 mr-2">{task.title}</p>
                  <Badge variant={statusMap[task.status]?.variant || "secondary"} className="text-[10px] shrink-0">
                    {statusMap[task.status]?.label || task.status}
                  </Badge>
                </div>
                {task.description && <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>👤 {getProfileName(task.assigned_to)}</span>
                  <span>{new Date(task.updated_at).toLocaleDateString("bn-BD")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
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

export default TaskStatusSection;
