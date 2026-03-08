import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TaskFilters from "./TaskFilters";
import TaskCard, { type Task } from "./TaskCard";
import CreateTaskDialog from "./CreateTaskDialog";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}

const TaskListView = ({ userId, role }: Props) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: tasksData }, { data: profilesData }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name"),
    ]);

    const profileMap = new Map<string, string>();
    profilesData?.forEach((p) => profileMap.set(p.user_id, p.full_name));
    setProfiles(profileMap);

    setTasks(
      (tasksData || []).map((t: any) => ({
        ...t,
        assignee_name: profileMap.get(t.assigned_to) || "Unknown",
        assigner_name: profileMap.get(t.assigned_by) || "Unknown",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("admin-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const filtered = tasks.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.task_number?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Management</h2>
        <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        totalCount={filtered.length}
      />

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading tasks...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No tasks found</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedId === task.id}
              onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
            />
          ))}
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={userId}
        onCreated={fetchData}
      />
    </div>
  );
};

export default TaskListView;
