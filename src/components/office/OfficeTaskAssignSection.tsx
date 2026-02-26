import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, RefreshCw, Clock, Users, Send, ChevronDown, ChevronUp,
  AlertTriangle, FileText, CheckCircle2, Circle, Loader2, Calendar,
  User, Pencil, Trash2, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
  businessId?: string | null;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "অপেক্ষমাণ", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "চলমান", icon: Loader2, color: "text-blue-500" },
  completed: { label: "সম্পন্ন", icon: CheckCircle2, color: "text-green-500" },
  resubmit: { label: "পুনরায়", icon: RotateCcw, color: "text-orange-500" },
};

const OfficeTaskAssignSection = ({ userId, role, businessId }: Props) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [taskReports, setTaskReports] = useState<Record<string, any[]>>({});

  // Inline create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", assigned_to: "" });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editTask, setEditTask] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", due_date: "", admin_note: "" });

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: p }, { data: r }, { data: ub }] = await Promise.all([
      supabase.from("tasks").select("*").eq("business_id", businessId || "").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, username"),
      supabase.from("user_roles").select("user_id, role"),
      businessId ? supabase.from("user_businesses").select("user_id").eq("business_id", businessId) : Promise.resolve({ data: [] }),
    ]);
    const businessUserIds = new Set((ub || []).map((x: any) => x.user_id));

    const roleMap: Record<string, string[]> = {};
    (r || []).forEach((ro: any) => {
      if (!roleMap[ro.user_id]) roleMap[ro.user_id] = [];
      roleMap[ro.user_id].push(ro.role);
    });
    setUserRoles(roleMap);

    let filteredTasks = t || [];
    if (role === "admin") {
      const superAdminIds = Object.entries(roleMap).filter(([_, roles]) => roles.includes("super_admin")).map(([uid]) => uid);
      filteredTasks = filteredTasks.filter(task => !superAdminIds.includes(task.assigned_by) || task.assigned_by === userId);
    }

    setTasks(filteredTasks);
    // Only keep profiles of users in this business group
    const groupProfiles = businessId ? (p || []).filter((pr: any) => businessUserIds.has(pr.user_id)) : (p || []);
    setProfiles(groupProfiles);
    setLoading(false);
  }, [userId, role, businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription for tasks
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel('office-tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `business_id=eq.${businessId}`,
      }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, fetchData]);

  // Track previous stats for animation
  const prevStats = useRef({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 });
  const [animatingStats, setAnimatingStats] = useState<Set<string>>(new Set());

  const getName = (uid: string) => {
    const p = profiles.find(x => x.user_id === uid);
    return p ? p.full_name : "—";
  };

  // Get office members (already filtered by business group)
  const officeMembers = profiles.filter(p => {
    const roles = userRoles[p.user_id] || [];
    return !roles.includes("super_admin") && !roles.includes("admin");
  });

  const handleCreate = async () => {
    if (!form.title || !form.assigned_to) {
      toast({ title: "টাইটেল ও ইউজার নির্বাচন করুন", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data: inserted, error } = await supabase.from("tasks").insert({
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to,
      assigned_by: userId,
      business_id: businessId || null,
    }).select("id").single();

    if (error) {
      toast({ title: "ত্রুটি হয়েছে", variant: "destructive" });
    } else {
      await supabase.from("notifications").insert({
        user_id: form.assigned_to,
        title: "নতুন অফিস টাস্ক",
        message: `"${form.title}" টাস্ক অ্যাসাইন হয়েছে`,
        type: "task_assigned",
        reference_id: inserted?.id,
      });
      toast({ title: "টাস্ক তৈরি হয়েছে ✓" });
      setForm({ title: "", description: "", due_date: "", assigned_to: "" });
      setShowCreate(false);
      fetchData();
    }
    setCreating(false);
  };

  const toggleExpand = async (taskId: string) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
      return;
    }
    setExpandedTask(taskId);
    if (!taskReports[taskId]) {
      const { data } = await supabase
        .from("task_reports")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      setTaskReports(prev => ({ ...prev, [taskId]: data || [] }));
    }
  };

  const openEdit = (task: any) => {
    setEditTask(task);
    setEditForm({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
      admin_note: task.admin_note || "",
    });
  };

  const saveEdit = async () => {
    if (!editTask) return;
    const { error } = await supabase.from("tasks").update({
      title: editForm.title,
      description: editForm.description || null,
      due_date: editForm.due_date || null,
      admin_note: editForm.admin_note || null,
    }).eq("id", editTask.id);
    if (error) {
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      toast({ title: "আপডেট হয়েছে ✓" });
      setEditTask(null);
      fetchData();
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast({ title: "ডিলিট ত্রুটি", variant: "destructive" });
    } else {
      toast({ title: "টাস্ক ডিলিট হয়েছে" });
      fetchData();
    }
  };

  const getTimeInfo = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return { text: "সময় শেষ!", overdue: true };
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    if (days > 0) return { text: `${days}দি ${hrs % 24}ঘ`, overdue: false };
    return { text: `${hrs}ঘ বাকি`, overdue: false };
  };

  // Filtered tasks
  const filtered = tasks.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (assigneeFilter !== "all" && t.assigned_to !== assigneeFilter) return false;
    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date).getTime() < Date.now() && t.status !== "completed").length,
  };

  // Detect stat changes for animation
  useEffect(() => {
    const changed = new Set<string>();
    (Object.keys(stats) as (keyof typeof stats)[]).forEach(key => {
      if (prevStats.current[key] !== stats[key]) changed.add(key);
    });
    if (changed.size > 0) {
      setAnimatingStats(changed);
      prevStats.current = { ...stats };
      const timer = setTimeout(() => setAnimatingStats(new Set()), 600);
      return () => clearTimeout(timer);
    }
  }, [stats.total, stats.pending, stats.in_progress, stats.completed, stats.overdue]);

  const statItems = [
    { key: "total", label: "মোট", value: stats.total, filterVal: "all", active: "bg-primary text-primary-foreground shadow-lg", inactive: "bg-muted/60 border border-border hover:bg-muted" },
    { key: "pending", label: "অপেক্ষমাণ", value: stats.pending, filterVal: "pending", active: "bg-yellow-500 text-white shadow-lg shadow-yellow-500/20", inactive: "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/40" },
    { key: "in_progress", label: "চলমান", value: stats.in_progress, filterVal: "in_progress", active: "bg-blue-500 text-white shadow-lg shadow-blue-500/20", inactive: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40" },
    { key: "completed", label: "সম্পন্ন", value: stats.completed, filterVal: "completed", active: "bg-green-500 text-white shadow-lg shadow-green-500/20", inactive: "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40" },
    { key: "overdue", label: "ওভারডিউ", value: stats.overdue, filterVal: "overdue", active: "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20", inactive: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          অ্যাসাইন টাস্ক
        </h2>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> নতুন টাস্ক
          </Button>
          <Button size="icon" variant="ghost" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Animated clickable stats */}
      <div className="grid grid-cols-5 gap-1.5">
        {statItems.map(s => {
          const isActive = statusFilter === s.filterVal;
          const isAnimating = animatingStats.has(s.key);
          return (
            <button
              key={s.key}
              className={`rounded-xl py-2.5 text-center transition-all duration-300 ease-out ${
                isActive ? s.active : s.inactive
              } ${isAnimating ? "animate-scale-in" : ""}`}
              onClick={() => setStatusFilter(isActive ? "all" : s.filterVal)}
            >
              <p className={`text-lg font-bold leading-none transition-transform duration-300 ${isAnimating ? "scale-125" : "scale-100"}`}>
                {s.value}
              </p>
              <p className={`text-[9px] mt-1 leading-tight font-medium ${isActive ? "opacity-90" : "text-muted-foreground"}`}>{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* Inline Create Form */}
      {showCreate && (
        <Card className="border-primary/30 border-2">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="টাস্ক টাইটেল *"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
              <Select value={form.assigned_to} onValueChange={v => setForm(p => ({ ...p, assigned_to: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="ইউজার নির্বাচন করুন *" />
                </SelectTrigger>
                <SelectContent>
                  {officeMembers.map(m => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name} (@{m.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="বিবরণ (ঐচ্ছিক)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2}
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="max-w-[180px]"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                অ্যাসাইন করো
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>বাতিল</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="স্ট্যাটাস" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল স্ট্যাটাস</SelectItem>
            <SelectItem value="pending">অপেক্ষমাণ</SelectItem>
            <SelectItem value="in_progress">চলমান</SelectItem>
            <SelectItem value="completed">সম্পন্ন</SelectItem>
            <SelectItem value="resubmit">পুনরায়</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="ইউজার ফিল্টার" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সকল ইউজার</SelectItem>
            {officeMembers.map(m => (
              <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task List - Table/Accordion style */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          লোড হচ্ছে...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
          কোন টাস্ক পাওয়া যায়নি
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {filtered.map(task => {
            const isExpanded = expandedTask === task.id;
            const timeInfo = task.due_date ? getTimeInfo(task.due_date) : null;
            const StatusIcon = statusConfig[task.status]?.icon || Circle;
            const reports = taskReports[task.id] || [];

            return (
              <div key={task.id} className="bg-card">
                {/* Row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(task.id)}
                >
                  <StatusIcon className={`h-4 w-4 shrink-0 ${statusConfig[task.status]?.color || ""}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getName(task.assigned_to)}
                      </span>
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${timeInfo?.overdue && task.status !== "completed" ? "text-destructive font-medium" : ""}`}>
                          <Clock className="h-3 w-3" />
                          {timeInfo?.overdue && task.status !== "completed" ? timeInfo.text : new Date(task.due_date).toLocaleDateString("bn-BD")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {statusConfig[task.status]?.label || task.status}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t bg-muted/20">
                    {task.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>অ্যাসাইন করেছেন: {getName(task.assigned_by)}</span>
                      <span>·</span>
                      <span>{new Date(task.created_at).toLocaleString("bn-BD")}</span>
                    </div>
                    {task.admin_note && (
                      <div className="text-xs bg-muted p-2 rounded italic">💬 নোট: {task.admin_note}</div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openEdit(task)}>
                        <Pencil className="h-3 w-3" /> সম্পাদনা
                      </Button>
                      {role === "super_admin" && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("টাস্কটি ডিলিট করতে চান?")) deleteTask(task.id); }}>
                          <Trash2 className="h-3 w-3" /> ডিলিট
                        </Button>
                      )}
                    </div>

                    {/* Reports */}
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        জমাকৃত রিপোর্ট ({reports.length})
                      </p>
                      {reports.length === 0 ? (
                        <p className="text-xs text-muted-foreground">কোন রিপোর্ট নেই</p>
                      ) : (
                        reports.map(rep => (
                          <div key={rep.id} className="rounded border p-2 space-y-1 bg-card">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">রিপোর্ট #{rep.report_number}</span>
                              <Badge variant={rep.status === "approved" ? "default" : rep.status === "not_approved" ? "destructive" : "secondary"} className="text-[10px]">
                                {rep.status === "approved" ? "অনুমোদিত" : rep.status === "not_approved" ? "প্রত্যাখ্যাত" : "অপেক্ষমাণ"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{rep.report_content}</p>
                            {rep.image_urls?.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {rep.image_urls.map((url: string, i: number) => (
                                  <img key={i} src={url} alt="" className="h-12 w-12 rounded object-cover border" />
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground">{new Date(rep.created_at).toLocaleString("bn-BD")}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTask} onOpenChange={o => { if (!o) setEditTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>টাস্ক সম্পাদনা</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="টাইটেল"
              value={editForm.title}
              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
            />
            <Textarea
              placeholder="বিবরণ"
              value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
            />
            <Input
              type="date"
              value={editForm.due_date}
              onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))}
            />
            <Textarea
              placeholder="অ্যাডমিন নোট"
              value={editForm.admin_note}
              onChange={e => setEditForm(p => ({ ...p, admin_note: e.target.value }))}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTask(null)}>বাতিল</Button>
            <Button onClick={saveEdit}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficeTaskAssignSection;
