import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Task } from "./TaskCard";

interface Props {
  tasks: Task[];
}

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

const priorityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-primary/10 text-primary border-primary/30",
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

const fmtDate = (d: string | null) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "";
  return n.toLocaleString();
};

const TaskTableView = ({ tasks }: Props) => {
  return (
    <ScrollArea className="w-full">
      <div className="min-w-[900px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px] text-xs font-bold">Task ID</TableHead>
              <TableHead className="min-w-[200px] text-xs font-bold">Description</TableHead>
              <TableHead className="w-[100px] text-xs font-bold">Assign To</TableHead>
              <TableHead className="w-[90px] text-xs font-bold">Label</TableHead>
              <TableHead className="w-[110px] text-xs font-bold">Due Date</TableHead>
              <TableHead className="w-[110px] text-xs font-bold">P. Date</TableHead>
              <TableHead className="w-[90px] text-xs font-bold text-right">Budget</TableHead>
              <TableHead className="w-[90px] text-xs font-bold text-right">Credit Line</TableHead>
              <TableHead className="w-[90px] text-xs font-bold text-right">T. Security</TableHead>
              <TableHead className="min-w-[120px] text-xs font-bold">Remark</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "completed";
              return (
                <TableRow key={task.id} className={isOverdue ? "bg-destructive/5" : ""}>
                  <TableCell className="text-xs font-mono text-muted-foreground py-2">
                    {task.task_number || "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <p className="text-xs font-medium leading-tight">{task.title}</p>
                    {task.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs py-2">{task.assignee_name || "—"}</TableCell>
                  <TableCell className="py-2">
                    {task.label ? (
                      <Badge className={`text-[10px] ${labelColors[task.label] || ""}`} variant="outline">
                        {labelLabels[task.label] || task.label}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className={`text-xs py-2 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                    {fmtDate(task.due_date)}
                  </TableCell>
                  <TableCell className="text-xs py-2">{fmtDate(task.planned_date)}</TableCell>
                  <TableCell className="text-xs py-2 text-right">{fmtNum(task.budget)}</TableCell>
                  <TableCell className="text-xs py-2 text-right">{task.credit_line || ""}</TableCell>
                  <TableCell className="text-xs py-2 text-right">{fmtNum(task.t_security)}</TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground">{task.admin_note || ""}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};

export default TaskTableView;
