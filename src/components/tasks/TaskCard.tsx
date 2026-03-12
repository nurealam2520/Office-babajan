import { Clock, AlertTriangle, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  due_date: string | null;
  planned_date: string | null;
  assigned_to: string;
  assigned_by: string;
  inputter_id: string | null;
  task_number: string | null;
  category: string | null;
  label: string | null;
  budget: number | null;
  credit_line: string | null;
  t_security: number | null;
  admin_note: string | null;
  created_at: string;
  assignee_name?: string;
  assigner_name?: string;
}

interface Props {
  task: Task;
  expanded: boolean;
  onToggle: () => void;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  issues: { label: "Issues", variant: "destructive" },
  processing: { label: "Processing", variant: "default" },
  ready_to_bid: { label: "Ready to Bid", variant: "outline" },
  bidded: { label: "Bidded", variant: "outline" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-accent/20 text-accent-foreground" },
  high: { label: "High", color: "bg-destructive/20 text-destructive" },
};

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

const getTimeRemaining = (dueDate: string) => {
  const diff = new Date(dueDate).getTime() - Date.now();
  if (diff < 0) return { text: "Overdue!", overdue: true, percent: 100 };
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(hrs / 24);
  if (days > 0)
    return {
      text: `${days}d ${hrs % 24}h remaining`,
      overdue: false,
      percent: Math.max(0, 100 - (diff / (7 * 86400000)) * 100),
    };
  return {
    text: `${hrs}h remaining`,
    overdue: false,
    percent: Math.min(90, 100 - (diff / 86400000) * 100),
  };
};

const TaskCard = ({ task, expanded, onToggle }: Props) => {
  const { toast } = useToast();
  const timeInfo = task.due_date ? getTimeRemaining(task.due_date) : null;
  const isOverdue = timeInfo?.overdue && task.status !== "completed";
  const prio = priorityMap[task.priority] || priorityMap.medium;

  const handleLabelChange = async (newLabel: string) => {
    const labelValue = newLabel === "none" ? null : newLabel;
    await supabase.from("tasks").update({ label: labelValue } as any).eq("id", task.id);
    toast({ title: `Label → ${labelValue ? labelLabels[labelValue] : "None"}` });
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? "border-destructive/50" : ""}`}
      onClick={onToggle}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {task.task_number && (
              <span className="text-[10px] font-mono text-muted-foreground">#{task.task_number}</span>
            )}
            <p className="text-sm font-medium truncate">{task.title}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={statusLabels[task.status]?.variant || "secondary"} className="text-[10px]">
              {statusLabels[task.status]?.label || task.status}
            </Badge>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${prio.color}`}>{prio.label}</span>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        {/* Assignee & Date */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>👤 {task.assignee_name || "Unknown"}</span>
          {task.due_date && (
            <span className={isOverdue ? "text-destructive font-medium" : ""}>
              📅 {new Date(task.due_date).toLocaleDateString("en-US")}
            </span>
          )}
        </div>

        {/* Progress */}
        {task.progress > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-1" />
          </div>
        )}

        {/* Time remaining */}
        {timeInfo && task.status !== "completed" && (
          <div className="flex items-center gap-1 text-[10px]">
            {timeInfo.overdue ? (
              <AlertTriangle className="h-3 w-3 text-destructive" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            <span className={timeInfo.overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
              {timeInfo.text}
            </span>
          </div>
        )}

        {/* Budget */}
        {task.budget != null && task.budget > 0 && (
          <span className="text-[10px] text-muted-foreground">
            💰 Budget: ৳{Number(task.budget).toLocaleString()}
          </span>
        )}

        {/* Label badge */}
        {task.label && (
          <Badge className={`text-[10px] ${labelColors[task.label] || ""}`} variant="outline">
            {labelLabels[task.label] || task.label}
          </Badge>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="pt-2 space-y-2 border-t" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {task.planned_date && (
                <div>
                  <span className="text-muted-foreground">🗓️ Planned: </span>
                  {new Date(task.planned_date).toLocaleDateString("en-US")}
                </div>
              )}
              {task.credit_line && (
                <div>
                  <span className="text-muted-foreground">💳 Credit: </span>
                  {task.credit_line}
                </div>
              )}
              {task.t_security != null && (
                <div>
                  <span className="text-muted-foreground">🔒 Security: </span>
                  {task.t_security.toLocaleString()}
                </div>
              )}
              {task.category && (
                <div>
                  <span className="text-muted-foreground">📂 Category: </span>
                  {task.category}
                </div>
              )}
              {task.assigner_name && (
                <div>
                  <span className="text-muted-foreground">📋 Assigned by: </span>
                  {task.assigner_name}
                </div>
              )}
            </div>

            {task.admin_note && (
              <p className="text-xs bg-muted rounded p-2 italic">💬 {task.admin_note}</p>
            )}

            {/* Label change */}
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Label:</span>
              <Select value={task.label || "none"} onValueChange={handleLabelChange}>
                <SelectTrigger className="h-7 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Label</SelectItem>
                  <SelectItem value="live">🟢 Live</SelectItem>
                  <SelectItem value="advance">🔵 Advance</SelectItem>
                  <SelectItem value="waiting_for_goods">🟠 Waiting for the Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;
export type { Task };
