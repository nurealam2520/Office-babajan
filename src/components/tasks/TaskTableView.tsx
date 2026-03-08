import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import EditTaskDialog from "./EditTaskDialog";
import type { Task } from "./TaskCard";

interface Props {
  tasks: Task[];
  staffList: { user_id: string; full_name: string }[];
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

const fmtDate = (d: string | null) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "";
  return n.toLocaleString();
};

const TaskTableView = ({ tasks, staffList }: Props) => {
  const { toast } = useToast();
  const [editTask, setEditTask] = useState<Task | null>(null);

  const handleLabelChange = async (taskId: string, newLabel: string) => {
    const labelValue = newLabel === "none" ? null : newLabel;
    await supabase.from("tasks").update({ label: labelValue } as any).eq("id", taskId);
    toast({ title: `Label updated` });
  };

  const handleAssignChange = async (taskId: string, newUserId: string) => {
    await supabase.from("tasks").update({ assigned_to: newUserId } as any).eq("id", taskId);
    toast({ title: `Assignee updated` });
  };

  return (
    <>
      <ScrollArea className="w-full">
        <div className="min-w-[900px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px] text-xs font-bold">Task ID</TableHead>
                <TableHead className="min-w-[200px] text-xs font-bold">Description</TableHead>
                <TableHead className="w-[140px] text-xs font-bold">Assign To</TableHead>
                <TableHead className="w-[150px] text-xs font-bold">Label</TableHead>
                <TableHead className="w-[110px] text-xs font-bold">Due Date</TableHead>
                <TableHead className="w-[110px] text-xs font-bold">P. Date</TableHead>
                <TableHead className="w-[90px] text-xs font-bold text-right">Budget</TableHead>
                <TableHead className="w-[90px] text-xs font-bold text-right">Credit Line</TableHead>
                <TableHead className="w-[90px] text-xs font-bold text-right">T. Security</TableHead>
                <TableHead className="min-w-[150px] text-xs font-bold">Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "completed";
                return (
                  <TableRow
                    key={task.id}
                    className={`cursor-pointer hover:bg-muted/30 ${isOverdue ? "bg-destructive/5" : ""}`}
                  >
                    <TableCell
                      className="text-xs font-mono text-muted-foreground py-2"
                      onClick={() => setEditTask(task)}
                    >
                      {task.task_number || "—"}
                    </TableCell>
                    <TableCell className="py-2" onClick={() => setEditTask(task)}>
                      <p className="text-xs font-medium leading-tight">{task.title}</p>
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      <Select value={task.assigned_to} onValueChange={(v) => handleAssignChange(task.id, v)}>
                        <SelectTrigger className="h-7 text-xs border-none shadow-none bg-transparent px-1">
                          <SelectValue>{task.assignee_name || "—"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.map(s => (
                            <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      <Select value={task.label || "none"} onValueChange={(v) => handleLabelChange(task.id, v)}>
                        <SelectTrigger className="h-7 text-xs border-none shadow-none bg-transparent px-1">
                          <SelectValue>
                            {task.label ? (
                              <Badge className={`text-[10px] ${labelColors[task.label] || ""}`} variant="outline">
                                {labelLabels[task.label] || task.label}
                              </Badge>
                            ) : "—"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Label</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="advance">Advance</SelectItem>
                          <SelectItem value="waiting_for_goods">Waiting for the Goods</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell
                      className={`text-xs py-2 ${isOverdue ? "text-destructive font-medium" : ""}`}
                      onClick={() => setEditTask(task)}
                    >
                      {fmtDate(task.due_date)}
                    </TableCell>
                    <TableCell className="text-xs py-2" onClick={() => setEditTask(task)}>{fmtDate(task.planned_date)}</TableCell>
                    <TableCell className="text-xs py-2 text-right" onClick={() => setEditTask(task)}>{fmtNum(task.budget)}</TableCell>
                    <TableCell className="text-xs py-2 text-right" onClick={() => setEditTask(task)}>{task.credit_line || ""}</TableCell>
                    <TableCell className="text-xs py-2 text-right" onClick={() => setEditTask(task)}>{fmtNum(task.t_security)}</TableCell>
                    <TableCell className="text-xs py-2 text-muted-foreground max-w-[200px]" onClick={() => setEditTask(task)}>
                      <p className="line-clamp-2">{task.admin_note || "—"}</p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => { if (!open) setEditTask(null); }}
        staffList={staffList}
      />
    </>
  );
};

export default TaskTableView;
