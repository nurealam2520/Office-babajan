import { Clock, User, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
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

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-primary/10 text-primary border-primary/30",
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-destructive/10 text-destructive",
  issues: "bg-amber-500/10 text-amber-600",
  processing: "bg-blue-500/10 text-blue-600",
  ready_to_bid: "bg-violet-500/10 text-violet-600",
  bidded: "bg-teal-500/10 text-teal-600",
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

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  issues: "Issues",
  processing: "Processing",
  ready_to_bid: "Ready to Bid",
  bidded: "Bidded",
};

const TaskCard = ({ task, expanded, onToggle }: Props) => {
  const isOverdue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "completed";

  return (
    <Card className={`transition-shadow hover:shadow-md ${isOverdue ? "border-destructive/50" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {task.task_number && (
                <span className="text-[10px] font-mono text-muted-foreground">#{task.task_number}</span>
              )}
              <h3 className="font-semibold text-sm text-foreground">{task.title}</h3>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {task.due_date && (
                <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  <Clock className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {isOverdue && <AlertTriangle className="h-3 w-3" />}
                </span>
              )}
              {task.assignee_name && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> {task.assignee_name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={`text-[10px] ${priorityColors[task.priority] || ""}`} variant="outline">
              {task.priority}
            </Badge>
            <Badge className={`text-[10px] ${statusColors[task.status] || ""}`} variant="outline">
              {statusLabels[task.status] || task.status}
            </Badge>
            <button onClick={onToggle} className="p-1 hover:bg-muted rounded">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {task.progress > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={task.progress} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground">{task.progress}%</span>
          </div>
        )}

        {expanded && (
          <div className="pt-2 space-y-2 border-t">
            {task.description && (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {task.planned_date && (
                <div>
                  <span className="text-muted-foreground">Planned: </span>
                  {new Date(task.planned_date).toLocaleDateString("en-US")}
                </div>
              )}
              {task.budget != null && (
                <div>
                  <span className="text-muted-foreground">Budget: </span>
                  {task.budget.toLocaleString()}
                </div>
              )}
              {task.credit_line && (
                <div>
                  <span className="text-muted-foreground">Credit Line: </span>
                  {task.credit_line}
                </div>
              )}
              {task.t_security != null && (
                <div>
                  <span className="text-muted-foreground">T. Security: </span>
                  {task.t_security.toLocaleString()}
                </div>
              )}
              {task.category && (
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  {task.category}
                </div>
              )}
              {task.assigner_name && (
                <div>
                  <span className="text-muted-foreground">Assigned by: </span>
                  {task.assigner_name}
                </div>
              )}
            </div>
            {task.admin_note && (
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Note</p>
                <p className="text-xs">{task.admin_note}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskCard;
export type { Task };
