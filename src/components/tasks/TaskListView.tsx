import { useEffect, useState, useCallback } from "react";
import { Plus, LayoutList, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TaskFilters from "./TaskFilters";
import TaskCard, { type Task } from "./TaskCard";
import TaskTableView from "./TaskTableView";
import CreateTaskDialog from "./CreateTaskDialog";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "member";
  initialSearch?: string;
}

const TaskListView = ({ userId, role, initialSearch = "" }: Props) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const fetchData = useCallback(async () => {
    setLoading(true);
    let tasksQuery = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (role === "member") {
      tasksQuery = tasksQuery.eq("assigned_to", userId);
    }
    const [{ data: tasksData }, { data: profilesData }] = await Promise.all([
      tasksQuery,
      supabase.from("profiles").select("user_id, full_name"),
    ]);

    const profileMap = new Map<string, string>();
    profilesData?.forEach((p) => profileMap.set(p.user_id, p.full_name));
    setProfiles(profileMap);
    setStaffList(profilesData || []);

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
    setSearch(initialSearch);
  }, [initialSearch]);

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
      // Filter by label value
      if (["live", "advance", "waiting_for_goods"].includes(q)) {
        return t.label === q;
      }
      // Filter by status
      if (["pending", "in_progress", "completed", "cancelled", "issues", "processing", "ready_to_bid", "bidded"].includes(q)) {
        return t.status === q;
      }
      // Filter overdue tasks
      if (q === "overdue") {
        return t.due_date && new Date(t.due_date).getTime() < Date.now() && t.status !== "completed";
      }
      return (
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.task_number?.toLowerCase().includes(q) ||
        t.assignee_name?.toLowerCase().includes(q) ||
        t.label?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Management</h2>
        <div className="flex items-center gap-1">
          <div className="flex items-center border rounded-md overflow-hidden mr-2">
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
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </div>

      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        totalCount={filtered.length}
      />

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading tasks...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No tasks found</p>
      ) : viewMode === "table" ? (
        <TaskTableView tasks={filtered} staffList={staffList} />
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
