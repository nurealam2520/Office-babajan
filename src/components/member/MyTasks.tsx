import { useEffect, useState } from "react";
import { ClipboardList, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  admin_note: string | null;
  created_at: string;
}

interface Props {
  userId: string;
}

const MyTasks = ({ userId }: Props) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"active" | "completed">("active");

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, status, due_date, admin_note, created_at")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
  };

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel(`member-tasks-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `assigned_to=eq.${userId}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const acceptTask = async (taskId: string) => {
    await supabase.from("tasks").update({ status: "in_progress" }).eq("id", taskId);
    toast({ title: "Task accepted" });
    fetchTasks();
  };

  const submitReport = async (taskId: string) => {
    if (!reportText.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("task_reports").insert({
      task_id: taskId,
      submitted_by: userId,
      report_content: reportText.trim(),
    });
    if (error) {
      toast({ title: "Error occurred", variant: "destructive" });
    } else {
      toast({ title: "Report submitted" });
      setReportText("");
      setExpandedId(null);
    }
    setSubmitting(false);
  };

  const filtered = tasks.filter(t =>
    filter === "active" ? t.status !== "completed" : t.status === "completed"
  );

  const isOverdue = (t: Task) => t.due_date && new Date(t.due_date).getTime() < Date.now() && t.status !== "completed";

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pending", variant: "outline" },
      in_progress: { label: "In Progress", variant: "default" },
      completed: { label: "Completed", variant: "secondary" },
    };
    const m = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
        >
          Active ({tasks.filter(t => t.status !== "completed").length})
        </Button>
        <Button
          variant={filter === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completed")}
        >
          Completed ({tasks.filter(t => t.status === "completed").length})
        </Button>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No tasks found</p>
      )}

      {filtered.map(task => (
        <Card
          key={task.id}
          className={`transition-shadow hover:shadow-md ${isOverdue(task) ? "border-destructive/50" : ""}`}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate">{task.title}</h3>
                {task.due_date && (
                  <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue(task) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString("en-US")}
                    {isOverdue(task) && " (Overdue)"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusBadge(task.status)}
                <button onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}>
                  {expandedId === task.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === task.id && (
              <div className="pt-2 space-y-3 border-t">
                {task.description && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                )}
                {task.admin_note && (
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Admin Note</p>
                    <p className="text-xs">{task.admin_note}</p>
                  </div>
                )}

                {task.status === "pending" && (
                  <Button size="sm" onClick={() => acceptTask(task.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Accept Task
                  </Button>
                )}

                {task.status === "in_progress" && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write your report..."
                      value={reportText}
                      onChange={e => setReportText(e.target.value)}
                      rows={3}
                    />
                    <Button size="sm" onClick={() => submitReport(task.id)} disabled={submitting || !reportText.trim()}>
                      {submitting ? "Submitting..." : "Submit Report"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MyTasks;
