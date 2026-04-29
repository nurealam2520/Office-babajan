import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, Clock, ChevronDown, ChevronUp, LayoutList, Table2, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MemberTaskTableView from "@/components/tasks/MemberTaskTableView";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  admin_note: string | null;
  label: string | null;
  created_at: string;
}

interface Props {
  userId: string;
}

const labelColors: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  advance: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  waiting_for_goods: "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

const labelLabels: Record<string, string> = {
  live: "Live",
  advance: "Advance",
  waiting_for_goods: "Waiting for the Goods",
};

const MyTasks = ({ userId }: Props) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, description, status, due_date, admin_note, label, created_at")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });
    setTasks((data as Task[]) || []);
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

  const changeLabel = async (taskId: string, newLabel: string) => {
    const labelValue = newLabel === "none" ? null : newLabel;
    await supabase.from("tasks").update({ label: labelValue } as any).eq("id", taskId);
    toast({ title: `Label updated to ${labelValue ? labelLabels[labelValue] : "None"}` });
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
      <div className="flex items-center justify-between">
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
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode("card")}
            className={`p-1.5 ${viewMode === "card" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Card View"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 ${viewMode === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            title="Excel View"
          >
            <Table2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No tasks found</p>
      )}

      {filtered.length > 0 && viewMode === "table" ? (
        <MemberTaskTableView tasks={filtered} onSelect={(id) => setExpandedId(expandedId === id ? null : id)} />
      ) : null}

      {/* Expanded detail panel for table view */}
      {viewMode === "table" && expandedId && (() => {
        const task = filtered.find(t => t.id === expandedId);
        if (!task) return null;
        return (
          <Card className="border-primary/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{task.title}</h3>
                <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
              <TaskDetailContent
                task={task}
                isOverdue={!!isOverdue(task)}
                statusBadge={statusBadge}
                labelColors={labelColors}
                labelLabels={labelLabels}
                onAccept={acceptTask}
                onChangeLabel={changeLabel}
                reportText={reportText}
                setReportText={setReportText}
                onSubmitReport={submitReport}
                submitting={submitting}
              />
            </CardContent>
          </Card>
        );
      })()}

      {filtered.length > 0 && viewMode === "card" ? filtered.map(task => (
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
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {task.label && (
                  <Badge className={`text-[10px] ${labelColors[task.label] || ""}`} variant="outline">
                    {labelLabels[task.label] || task.label}
                  </Badge>
                )}
                {statusBadge(task.status)}
                <button onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}>
                  {expandedId === task.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === task.id && (
              <TaskDetailContent
                task={task}
                isOverdue={!!isOverdue(task)}
                statusBadge={statusBadge}
                labelColors={labelColors}
                labelLabels={labelLabels}
                onAccept={acceptTask}
                onChangeLabel={changeLabel}
                reportText={reportText}
                setReportText={setReportText}
                onSubmitReport={submitReport}
                submitting={submitting}
              />
            )}
          </CardContent>
        </Card>
      )) : null}
    </div>
  );
};

/** Extracted detail content shown when a task is expanded */
const TaskDetailContent = ({
  task,
  isOverdue,
  statusBadge,
  labelColors,
  labelLabels,
  onAccept,
  onChangeLabel,
  reportText,
  setReportText,
  onSubmitReport,
  submitting,
}: {
  task: any;
  isOverdue: boolean;
  statusBadge: (s: string) => JSX.Element;
  labelColors: Record<string, string>;
  labelLabels: Record<string, string>;
  onAccept: (id: string) => void;
  onChangeLabel: (id: string, label: string) => void;
  reportText: string;
  setReportText: (v: string) => void;
  onSubmitReport: (id: string) => void;
  submitting: boolean;
}) => (
  <div className="pt-2 space-y-3 border-t">
    {/* Summary stats */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="rounded-md bg-muted/50 p-2 text-center">
        <p className="text-[10px] text-muted-foreground">Status</p>
        <div className="mt-1">{statusBadge(task.status)}</div>
      </div>
      <div className="rounded-md bg-muted/50 p-2 text-center">
        <p className="text-[10px] text-muted-foreground">Due Date</p>
        <p className={`text-xs font-medium mt-1 ${isOverdue ? "text-destructive" : ""}`}>
          {task.due_date ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
          {isOverdue && " ⚠"}
        </p>
      </div>
      <div className="rounded-md bg-muted/50 p-2 text-center">
        <p className="text-[10px] text-muted-foreground">Created</p>
        <p className="text-xs font-medium mt-1">
          {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
      <div className="rounded-md bg-muted/50 p-2 text-center">
        <p className="text-[10px] text-muted-foreground">Label</p>
        {task.label ? (
          <Badge className={`text-[10px] mt-1 ${labelColors[task.label] || ""}`} variant="outline">
            {labelLabels[task.label] || task.label}
          </Badge>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">—</p>
        )}
      </div>
    </div>

    {task.description && (
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>
    )}

    {task.admin_note && (
      <div className="rounded-md bg-muted/50 p-2">
        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Admin Note</p>
        <p className="text-xs">{task.admin_note}</p>
      </div>
    )}

    {/* Label change */}
    <div className="flex items-center gap-2">
      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Change Label:</span>
      <Select value={task.label || "none"} onValueChange={(v) => onChangeLabel(task.id, v)}>
        <SelectTrigger className="h-7 w-[180px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Label</SelectItem>
          <SelectItem value="live">Live</SelectItem>
          <SelectItem value="advance">Advance</SelectItem>
          <SelectItem value="waiting_for_goods">Waiting for the Goods</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {task.status === "pending" && (
      <Button size="sm" onClick={() => onAccept(task.id)}>
        <CheckCircle2 className="h-4 w-4 mr-1" /> Accept Task
      </Button>
    )}

    {task.status !== "completed" && (
      <div className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3">
        <p className="text-xs font-semibold text-primary">📝 Submit Report</p>
        <Textarea
          placeholder="Describe your progress, findings, or completion details..."
          value={reportText}
          onChange={e => setReportText(e.target.value)}
          rows={3}
        />
        <Button size="sm" onClick={() => onSubmitReport(task.id)} disabled={submitting || !reportText.trim()} className="w-full">
          {submitting ? "Submitting..." : "Submit Report"}
        </Button>
      </div>
    )}
  </div>
);

export default MyTasks;
