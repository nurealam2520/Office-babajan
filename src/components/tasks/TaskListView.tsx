import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, RefreshCw, ClipboardList, List, LayoutGrid, Calendar as CalendarIcon,
  Printer, FileDown, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import TaskCard, { type Task } from "./TaskCard";
import TaskTableView from "./TaskTableView";
import CreateTaskDialog from "./CreateTaskDialog";
import TaskReportPrintView from "./TaskReportPrintView";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "member";
  initialSearch?: string;
}

const labelFilters = [
  { value: "all", label: "All Labels" },
  { value: "live", label: "🟢 Live" },
  { value: "advance", label: "🔵 Advance" },
  { value: "waiting_for_goods", label: "🟠 Waiting for Goods" },
];

const TaskListView = ({ userId, role, initialSearch = "" }: Props) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [labelFilter, setLabelFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table" | "calendar">("table");
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

  const filtered = tasks.filter((t) => {
    if (labelFilter !== "all" && t.label !== labelFilter) return false;
    if (userFilter !== "all" && t.assigned_to !== userFilter) return false;
    if (search) {
      const q = search.toLowerCase();
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

  // Group by date for calendar view
  const groupedByDate = filtered.reduce((acc, t) => {
    const date = t.due_date ? new Date(t.due_date).toISOString().split("T")[0] : "no_date";
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Task Management</h2>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs h-8">
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs h-8">
            <FileDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          {role !== "member" && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs h-8">
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} className="h-8 w-8 p-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* View mode & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 rounded-lg border p-0.5 bg-muted/30">
          {[
            { mode: "card" as const, icon: LayoutGrid, label: "কার্ড" },
            { mode: "table" as const, icon: List, label: "টেবিল" },
            { mode: "calendar" as const, icon: CalendarIcon, label: "ক্যালেন্ডার" },
          ].map((v) => (
            <Button
              key={v.mode}
              size="sm"
              variant={viewMode === v.mode ? "default" : "ghost"}
              className="h-7 text-xs gap-1 px-2"
              onClick={() => setViewMode(v.mode)}
            >
              <v.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{v.label}</span>
            </Button>
          ))}
        </div>

        <Select value={labelFilter} onValueChange={setLabelFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {labelFilters.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {staffList.length > 0 && (
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="সব ইউজার" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ইউজার</SelectItem>
              {staffList.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Badge variant="secondary" className="text-xs">{filtered.length} টাস্ক</Badge>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 opacity-30" />
            <p className="text-sm">কোন টাস্ক নেই</p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <TaskTableView tasks={filtered} staffList={staffList} />
      ) : viewMode === "card" ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              expanded={expandedId === task.id}
              onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
            />
          ))}
        </div>
      ) : (
        /* Calendar View */
        <div className="space-y-3">
          {Object.entries(groupedByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dateTasks]) => (
              <div key={date}>
                <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {date === "no_date"
                    ? "তারিখ নির্ধারিত নয়"
                    : new Date(date).toLocaleDateString("bn-BD", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                  <Badge variant="secondary" className="text-[10px]">{dateTasks.length}</Badge>
                </h3>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 pl-6">
                  {dateTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      expanded={expandedId === task.id}
                      onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    />
                  ))}
                </div>
              </div>
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
