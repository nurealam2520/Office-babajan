import { useState, useCallback, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, ArrowUpDown, Check, X, Pencil } from "lucide-react";
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

type SortKey = "task_number" | "title" | "assigned_to" | "label" | "due_date" | "planned_date" | "budget" | "credit_line" | "t_security" | "admin_note";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: SortKey;
  label: string;
  minWidth: number;
  defaultWidth: number;
  align?: "left" | "right";
}

const COLUMNS: ColumnDef[] = [
  { key: "task_number", label: "Task ID", minWidth: 50, defaultWidth: 70 },
  { key: "title", label: "Description", minWidth: 120, defaultWidth: 180 },
  { key: "assigned_to", label: "Assign To", minWidth: 80, defaultWidth: 120 },
  { key: "label", label: "Label", minWidth: 80, defaultWidth: 120 },
  { key: "due_date", label: "Due Date", minWidth: 80, defaultWidth: 100 },
  { key: "planned_date", label: "P. Date", minWidth: 80, defaultWidth: 100 },
  { key: "budget", label: "Budget", minWidth: 60, defaultWidth: 80, align: "right" },
  { key: "credit_line", label: "Credit Line", minWidth: 60, defaultWidth: 80, align: "right" },
  { key: "t_security", label: "T. Security", minWidth: 60, defaultWidth: 80, align: "right" },
  { key: "admin_note", label: "Remark", minWidth: 100, defaultWidth: 140 },
];

// Inline editable cell
const InlineEditCell = ({
  value,
  onSave,
  type = "text",
  align = "left",
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  type?: "text" | "number" | "date";
  align?: "left" | "right";
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = async () => {
    if (editValue !== value) {
      await onSave(editValue);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-0.5">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          onBlur={handleSave}
          className={`h-6 text-xs px-1 py-0 min-w-0 ${align === "right" ? "text-right" : ""}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`group/cell flex items-center gap-1 cursor-pointer min-h-[24px] ${align === "right" ? "justify-end" : ""}`}
      onDoubleClick={() => {
        setEditValue(value);
        setEditing(true);
      }}
    >
      <span className="text-xs truncate">{value || "—"}</span>
      <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover/cell:opacity-100 shrink-0 transition-opacity" />
    </div>
  );
};

// Resizable column header
const ResizableHeader = ({
  children,
  width,
  onResize,
  className = "",
}: {
  children: React.ReactNode;
  width: number;
  onResize: (delta: number) => void;
  className?: string;
}) => {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startWidth.current = width;

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX.current;
      onResize(delta);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <TableHead
      className={`relative select-none ${className}`}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      {children}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
        onMouseDown={onMouseDown}
      />
    </TableHead>
  );
};

const TaskTableView = ({ tasks, staffList }: Props) => {
  const { toast } = useToast();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map((c) => c.defaultWidth));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleResize = (index: number, delta: number) => {
    setColWidths((prev) => {
      const next = [...prev];
      next[index] = Math.max(COLUMNS[index].minWidth, COLUMNS[index].defaultWidth + delta);
      return next;
    });
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortKey) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    const av = (a as any)[sortKey];
    const bv = (b as any)[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  const handleLabelChange = async (taskId: string, newLabel: string) => {
    const labelValue = newLabel === "none" ? null : newLabel;
    const { error } = await supabase.from("tasks").update({ label: labelValue }).eq("id", taskId);
    if (error) {
      toast({ title: "Label update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Label updated" });
    }
  };

  const handleAssignChange = async (taskId: string, newUserId: string) => {
    const { error } = await supabase.from("tasks").update({ assigned_to: newUserId }).eq("id", taskId);
    if (error) {
      toast({ title: "Assignee update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assignee updated" });
    }
  };

  const handleInlineUpdate = async (taskId: string, field: string, value: string) => {
    let updateData: Record<string, any> = {};
    if (field === "budget" || field === "t_security") {
      updateData[field] = value ? parseFloat(value) : null;
    } else if (field === "due_date" || field === "planned_date") {
      updateData[field] = value || null;
    } else {
      updateData[field] = value || null;
    }
    const { error } = await supabase.from("tasks").update(updateData).eq("id", taskId);
    if (error) {
      toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "আপডেট হয়েছে" });
    }
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  return (
    <>
      <div className="w-full overflow-x-auto border rounded-lg mx-0 touch-pan-x -webkit-overflow-scrolling-touch">
        <table className="caption-bottom text-xs sm:text-sm" style={{ width: `${colWidths.reduce((s, w) => s + w, 0)}px`, tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur [&_tr]:border-b">
              <TableRow>
                {COLUMNS.map((col, i) => (
                  <ResizableHeader
                    key={col.key}
                    width={colWidths[i]}
                    onResize={(delta) => handleResize(i, delta)}
                    className={`text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors ${col.align === "right" ? "text-right" : ""}`}
                  >
                    <div
                      className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span>{col.label}</span>
                      <SortIcon colKey={col.key} />
                    </div>
                  </ResizableHeader>
                ))}
              </TableRow>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {sortedTasks.map((task) => {
                const isOverdue =
                  task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "completed";
                return (
                  <TableRow
                    key={task.id}
                    className={`hover:bg-muted/30 transition-colors ${isOverdue ? "bg-destructive/5" : ""}`}
                  >
                    {/* Task ID */}
                    <TableCell
                      className="text-xs font-mono text-muted-foreground py-1.5 cursor-pointer"
                      style={{ width: colWidths[0] }}
                      onClick={() => setEditTask(task)}
                    >
                      {task.task_number || "—"}
                    </TableCell>

                    {/* Description - inline editable */}
                    <TableCell className="py-1.5" style={{ width: colWidths[1] }}>
                      <InlineEditCell
                        value={task.title}
                        onSave={(v) => handleInlineUpdate(task.id, "title", v)}
                      />
                      {task.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                    </TableCell>

                    {/* Assign To - dropdown */}
                    <TableCell className="py-1.5" style={{ width: colWidths[2] }} onClick={(e) => e.stopPropagation()}>
                      <Select value={task.assigned_to} onValueChange={(v) => handleAssignChange(task.id, v)}>
                        <SelectTrigger className="h-6 text-xs border-none shadow-none bg-transparent px-1">
                          <SelectValue>{task.assignee_name || "—"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.map((s) => (
                            <SelectItem key={s.user_id} value={s.user_id}>
                              {s.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Label - dropdown */}
                    <TableCell className="py-1.5" style={{ width: colWidths[3] }} onClick={(e) => e.stopPropagation()}>
                      <Select value={task.label || "none"} onValueChange={(v) => handleLabelChange(task.id, v)}>
                        <SelectTrigger className="h-6 text-xs border-none shadow-none bg-transparent px-1">
                          <SelectValue>
                            {task.label ? (
                              <Badge className={`text-[10px] ${labelColors[task.label] || ""}`} variant="outline">
                                {labelLabels[task.label] || task.label}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Label</SelectItem>
                          <SelectItem value="live">🟢 Live</SelectItem>
                          <SelectItem value="advance">🔵 Advance</SelectItem>
                          <SelectItem value="waiting_for_goods">🟠 Waiting for the Goods</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Due Date - inline editable */}
                    <TableCell
                      className={`py-1.5 ${isOverdue ? "text-destructive font-medium" : ""}`}
                      style={{ width: colWidths[4] }}
                    >
                      <InlineEditCell
                        value={task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : ""}
                        onSave={(v) => handleInlineUpdate(task.id, "due_date", v)}
                        type="date"
                      />
                    </TableCell>

                    {/* Planned Date - inline editable */}
                    <TableCell className="py-1.5" style={{ width: colWidths[5] }}>
                      <InlineEditCell
                        value={task.planned_date ? new Date(task.planned_date).toISOString().split("T")[0] : ""}
                        onSave={(v) => handleInlineUpdate(task.id, "planned_date", v)}
                        type="date"
                      />
                    </TableCell>

                    {/* Budget - inline editable */}
                    <TableCell className="py-1.5" style={{ width: colWidths[6] }}>
                      <InlineEditCell
                        value={task.budget?.toString() || ""}
                        onSave={(v) => handleInlineUpdate(task.id, "budget", v)}
                        type="number"
                        align="right"
                      />
                    </TableCell>

                    {/* Credit Line - inline editable */}
                    <TableCell className="py-1.5" style={{ width: colWidths[7] }}>
                      <InlineEditCell
                        value={task.credit_line || ""}
                        onSave={(v) => handleInlineUpdate(task.id, "credit_line", v)}
                        align="right"
                      />
                    </TableCell>

                    {/* T. Security - inline editable */}
                    <TableCell className="py-1.5" style={{ width: colWidths[8] }}>
                      <InlineEditCell
                        value={task.t_security?.toString() || ""}
                        onSave={(v) => handleInlineUpdate(task.id, "t_security", v)}
                        type="number"
                        align="right"
                      />
                    </TableCell>

                    {/* Remark - inline editable */}
                    <TableCell className="py-1.5" style={{ width: colWidths[9] }}>
                      <InlineEditCell
                        value={task.admin_note || ""}
                        onSave={(v) => handleInlineUpdate(task.id, "admin_note", v)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </table>
      </div>

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
        staffList={staffList}
      />
    </>
  );
};

export default TaskTableView;
