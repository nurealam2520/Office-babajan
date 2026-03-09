import { useState, useCallback, useRef, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUp, ArrowDown, ArrowUpDown, Pencil } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  status: string;
  priority: string;
  due_date?: string;
  planned_date?: string;
  budget?: number;
  credit_line?: string;
  t_security?: number;
  admin_note?: string;
  task_code?: string;
}

interface Props {
  tasks: Task[];
  profiles: Array<{ user_id: string; full_name: string }>;
}

// Status এবং Priority mapping
const allStatuses: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_assignment: { label: "অ্যাসাইনমেন্ট অপেক্ষমাণ", variant: "outline" },
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  in_progress: { label: "কাজ চলছে", variant: "default" },
  completed: { label: "সম্পন্ন", variant: "outline" },
  canceled: { label: "বাতিল", variant: "destructive" },
  issues: { label: "সমস্যা", variant: "destructive" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low: { label: "নিম্ন", color: "bg-muted text-muted-foreground" },
  medium: { label: "মধ্যম", color: "bg-accent/20 text-accent-foreground" },
  high: { label: "উচ্চ", color: "bg-destructive/20 text-destructive" },
};

type SortKey = "task_code" | "title" | "assigned_to" | "priority" | "status" | "due_date" | "planned_date" | "budget";
type SortDir = "asc" | "desc";

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

const TaskTableViewExample = ({ tasks, profiles }: Props) => {
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
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

  const handleAssignChange = async (taskId: string, newUserId: string) => {
    const { error } = await supabase.from("tasks").update({ assigned_to: newUserId }).eq("id", taskId);
    if (error) {
      toast({ title: "Assignee আপডেট ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assignee আপডেট হয়েছে" });
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

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || "অজানা ব্যবহারকারী";
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
    <div className="w-full overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <TableRow>
            <TableHead className="text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("task_code")}>
              <div className="flex items-center gap-1">
                <span>কোড</span>
                <SortIcon colKey="task_code" />
              </div>
            </TableHead>
            <TableHead className="text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("title")}>
              <div className="flex items-center gap-1">
                <span>শিরোনাম</span>
                <SortIcon colKey="title" />
              </div>
            </TableHead>
            <TableHead className="text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("assigned_to")}>
              <div className="flex items-center gap-1">
                <span>প্রাপক</span>
                <SortIcon colKey="assigned_to" />
              </div>
            </TableHead>
            <TableHead className="text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("priority")}>
              <div className="flex items-center gap-1">
                <span>প্রায়োরিটি</span>
                <SortIcon colKey="priority" />
              </div>
            </TableHead>
            <TableHead className="text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("status")}>
              <div className="flex items-center gap-1">
                <span>স্ট্যাটাস</span>
                <SortIcon colKey="status" />
              </div>
            </TableHead>
            <TableHead className="text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("due_date")}>
              <div className="flex items-center gap-1">
                <span>সময়সীমা</span>
                <SortIcon colKey="due_date" />
              </div>
            </TableHead>
            <TableHead className="text-xs font-bold cursor-pointer hover:bg-muted/80 transition-colors text-right" onClick={() => handleSort("budget")}>
              <div className="flex items-center gap-1 justify-end">
                <span>বাজেট</span>
                <SortIcon colKey="budget" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const isOverdue =
              task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "completed";
            return (
              <TableRow
                key={task.id}
                className={`hover:bg-muted/30 transition-colors ${isOverdue ? "bg-destructive/5" : ""}`}
              >
                {/* Task Code */}
                <TableCell className="text-xs font-mono py-1.5">
                  {task.task_code || "—"}
                </TableCell>

                {/* Title - inline editable */}
                <TableCell className="py-1.5">
                  <InlineEditCell
                    value={task.title}
                    onSave={(v) => handleInlineUpdate(task.id, "title", v)}
                  />
                  {task.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                </TableCell>

                {/* Assigned To - dropdown */}
                <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                  <Select value={task.assigned_to} onValueChange={(v) => handleAssignChange(task.id, v)}>
                    <SelectTrigger className="h-6 text-xs border-none shadow-none bg-transparent px-1">
                      <SelectValue>{getProfileName(task.assigned_to)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                {/* Priority */}
                <TableCell className="py-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityMap[task.priority]?.color || ""}`}>
                    {priorityMap[task.priority]?.label || task.priority}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell className="py-1.5">
                  <Badge variant={allStatuses[task.status]?.variant || "secondary"} className="text-[10px]">
                    {allStatuses[task.status]?.label || task.status}
                  </Badge>
                </TableCell>

                {/* Due Date - inline editable */}
                <TableCell
                  className={`py-1.5 ${isOverdue ? "text-destructive font-medium" : ""}`}
                >
                  <InlineEditCell
                    value={task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : ""}
                    onSave={(v) => handleInlineUpdate(task.id, "due_date", v)}
                    type="date"
                  />
                </TableCell>

                {/* Budget - inline editable */}
                <TableCell className="py-1.5">
                  <InlineEditCell
                    value={task.budget?.toString() || ""}
                    onSave={(v) => handleInlineUpdate(task.id, "budget", v)}
                    type="number"
                    align="right"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTableViewExample;
