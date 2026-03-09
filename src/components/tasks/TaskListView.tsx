import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, LayoutList, Table2, Printer, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import TaskFilters from "./TaskFilters";
import TaskCard, { type Task } from "./TaskCard";
import TaskTableView from "./TaskTableView";
import CreateTaskDialog from "./CreateTaskDialog";
import TaskReportPrintView from "./TaskReportPrintView";

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
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    printRef.current.classList.remove("hidden");
    window.print();
    setTimeout(() => printRef.current?.classList.add("hidden"), 500);
  };

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
  }, [role, userId]);

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

  const LABEL_VALUES = ["live", "advance", "waiting_for_goods"];

  const filtered = tasks.filter((t) => {
    // Label filter
    if (statusFilter !== "all") {
      if (t.label !== statusFilter) return false;
    }
    // User filter
    if (userFilter !== "all" && t.assigned_to !== userFilter) return false;
    // Date range filter
    if (dateFrom) {
      const taskDate = t.due_date || t.created_at;
      if (taskDate && new Date(taskDate) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const taskDate = t.due_date || t.created_at;
      if (taskDate && new Date(taskDate) > new Date(dateTo + "T23:59:59")) return false;
    }
    // Search text
    if (search) {
      const q = search.toLowerCase();
      if (["live", "advance", "waiting_for_goods"].includes(q)) {
        return t.label === q;
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
          <Button size="sm" variant="outline" className="gap-1" onClick={handlePrint} title="Print / Save as PDF">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={handlePrint} title="Save as PDF">
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <div className="flex items-center border rounded-md overflow-hidden ml-2">
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
          {role !== "member" && (
            <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Task
            </Button>
          )}
        </div>
      </div>

      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        totalCount={filtered.length}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        userFilter={userFilter}
        onUserFilterChange={setUserFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        staffList={staffList}
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

      <TaskReportPrintView ref={printRef} tasks={filtered} />
    </div>
  );
};

export default TaskListView;
