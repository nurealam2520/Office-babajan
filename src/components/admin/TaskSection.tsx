import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardList, RefreshCw, Clock, Save, Users, MessageSquare, AlertTriangle, Eye, FileText, Image, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  in_progress: { label: "কাজ চলছে", variant: "default" },
  completed: { label: "সম্পন্ন", variant: "outline" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive" },
};

const TaskSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", due_date: "" });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [savedTasksOpen, setSavedTasksOpen] = useState(false);
  const [savedTasks, setSavedTasks] = useState<{ title: string; description: string }[]>([]);
  const [extendOpen, setExtendOpen] = useState<{ open: boolean; task: any }>({ open: false, task: null });
  const [newDueDate, setNewDueDate] = useState("");
  const [reassignOpen, setReassignOpen] = useState<{ open: boolean; task: any }>({ open: false, task: null });
  const [reassignTo, setReassignTo] = useState("");
  const [detailOpen, setDetailOpen] = useState<{ open: boolean; task: any }>({ open: false, task: null });
  const [taskReports, setTaskReports] = useState<any[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [allReports, setAllReports] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: p }, { data: r }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, username"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const roleMap: Record<string, string[]> = {};
    (r || []).forEach((role: any) => {
      if (!roleMap[role.user_id]) roleMap[role.user_id] = [];
      roleMap[role.user_id].push(role.role);
    });
    setUserRoles(roleMap);

    // Filter tasks based on role visibility
    let filteredTasks = t || [];
    if (role === "admin") {
      // Admin can't see super_admin's tasks
      const superAdminIds = Object.entries(roleMap).filter(([_, roles]) => roles.includes("super_admin")).map(([uid]) => uid);
      filteredTasks = filteredTasks.filter(task => !superAdminIds.includes(task.assigned_by) || task.assigned_by === userId);
    } else if (role === "manager") {
      // Manager can't see admin's or super_admin's assigned tasks (only their own and tasks assigned to them)
      const adminIds = Object.entries(roleMap).filter(([_, roles]) => roles.includes("admin") || roles.includes("super_admin")).map(([uid]) => uid);
      filteredTasks = filteredTasks.filter(task => !adminIds.includes(task.assigned_by) || task.assigned_by === userId);
    }

    setTasks(filteredTasks);
    setProfiles(p || []);
    setLoading(false);
  }, [userId, role]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load saved tasks from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("saved_task_templates");
    if (stored) setSavedTasks(JSON.parse(stored));
  }, []);

  const getProfileName = (uid: string | null | undefined) => {
    if (!uid) return "অজানা";
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const createTask = async () => {
    if (!newTask.title || selectedUsers.length === 0) return;
    
    const inserts = selectedUsers.map(uid => ({
      assigned_by: userId,
      assigned_to: uid,
      title: newTask.title,
      description: newTask.description || null,
      due_date: newTask.due_date || null,
    }));

    const { data: insertedTasks, error } = await supabase.from("tasks").insert(inserts).select("id, assigned_to");
    if (error) {
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      for (const task of (insertedTasks || [])) {
        await supabase.from("notifications").insert({
          user_id: task.assigned_to,
          title: "নতুন টাস্ক",
          message: `আপনাকে "${newTask.title}" টাস্ক অ্যাসাইন করা হয়েছে`,
          type: "task_assigned",
          reference_id: task.id,
        });
      }
      toast({ title: "সফল", description: `${selectedUsers.length} জনকে টাস্ক দেয়া হয়েছে` });
      setNewTask({ title: "", description: "", due_date: "" });
      setSelectedUsers([]);
      setCreateOpen(false);
      fetchData();
    }
  };

  const saveTaskTemplate = () => {
    if (!newTask.title) return;
    const updated = [...savedTasks, { title: newTask.title, description: newTask.description }];
    setSavedTasks(updated);
    localStorage.setItem("saved_task_templates", JSON.stringify(updated));
    toast({ title: "সংরক্ষিত", description: "টাস্ক টেমপ্লেট সেভ হয়েছে" });
  };

  const loadTemplate = (template: { title: string; description: string }) => {
    setNewTask(prev => ({ ...prev, title: template.title, description: template.description }));
    setSavedTasksOpen(false);
    setCreateOpen(true);
  };

  const deleteTemplate = (index: number) => {
    const updated = savedTasks.filter((_, i) => i !== index);
    setSavedTasks(updated);
    localStorage.setItem("saved_task_templates", JSON.stringify(updated));
  };

  const getTimeRemaining = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return { text: "সময় শেষ!", overdue: true, percent: 100 };
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    if (days > 0) return { text: `${days} দিন ${hrs % 24} ঘণ্টা বাকি`, overdue: false, percent: Math.max(0, 100 - (diff / (7 * 86400000)) * 100) };
    return { text: `${hrs} ঘণ্টা বাকি`, overdue: false, percent: Math.min(90, 100 - (diff / 86400000) * 100) };
  };

  const extendDueDate = async () => {
    if (!extendOpen.task || !newDueDate) return;
    const { error } = await supabase.from("tasks").update({ due_date: newDueDate }).eq("id", extendOpen.task.id);
    if (error) {
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "সময় বাড়ানো হয়েছে" });
      setExtendOpen({ open: false, task: null });
      setNewDueDate("");
      fetchData();
    }
  };

  const reassignTask = async () => {
    if (!reassignOpen.task || !reassignTo) return;
    const { error } = await supabase.from("tasks").update({ assigned_to: reassignTo, status: "pending" }).eq("id", reassignOpen.task.id);
    if (error) {
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      await supabase.from("notifications").insert({
        user_id: reassignTo,
        title: "টাস্ক অ্যাসাইন",
        message: `আপনাকে "${reassignOpen.task.title}" টাস্ক অ্যাসাইন করা হয়েছে`,
        type: "task_assigned",
      });
      toast({ title: "সফল", description: "টাস্ক রিঅ্যাসাইন হয়েছে" });
      setReassignOpen({ open: false, task: null });
      setReassignTo("");
      fetchData();
    }
  };

  const openTaskDetail = async (task: any) => {
    setDetailOpen({ open: true, task });
    const { data } = await supabase
      .from("task_reports")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });
    setTaskReports(data || []);
  };

  const openTaskLog = async () => {
    setLogOpen(true);
    const { data } = await supabase
      .from("task_reports")
      .select("*")
      .order("created_at", { ascending: false });
    setAllReports(data || []);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">টাস্ক ম্যানেজমেন্ট</h2>
        <div className="flex gap-2">
          {role === "super_admin" && (
            <Button size="sm" variant="outline" onClick={openTaskLog} className="gap-1.5 text-xs">
              <List className="h-3.5 w-3.5" /> সকল লগ
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setSavedTasksOpen(true)} className="gap-1.5 text-xs">
            <Save className="h-3.5 w-3.5" /> টাস্ক লিস্ট
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> নতুন টাস্ক
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12" />
            <p>কোন টাস্ক নেই</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tasks.map(task => {
            const timeInfo = task.due_date ? getTimeRemaining(task.due_date) : null;
            return (
              <Card key={task.id} className={`cursor-pointer hover:shadow-md transition-shadow ${timeInfo?.overdue && task.status !== "completed" ? "border-destructive/50" : ""}`}
                onClick={() => openTaskDetail(task)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{task.title}</CardTitle>
                    <Badge variant={statusMap[task.status]?.variant || "secondary"} className="text-[10px]">
                      {statusMap[task.status]?.label || task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>👤 {getProfileName(task.assigned_to)}</span>
                    {task.due_date && (
                      <span className={timeInfo?.overdue ? "text-destructive font-medium" : ""}>
                        📅 {new Date(task.due_date).toLocaleDateString("bn-BD")}
                      </span>
                    )}
                  </div>
                  {timeInfo && task.status !== "completed" && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px]">
                        {timeInfo.overdue ? (
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        <span className={timeInfo.overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {timeInfo.text}
                        </span>
                      </div>
                      <Progress value={timeInfo.percent} className="h-1" />
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    অ্যাসাইন: {getProfileName(task.assigned_by)} · {new Date(task.created_at).toLocaleDateString("bn-BD")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen.open} onOpenChange={o => setDetailOpen({ open: o, task: o ? detailOpen.task : null })}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {detailOpen.task?.title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-4 pr-4">
              {/* Task info */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={statusMap[detailOpen.task?.status]?.variant || "secondary"}>
                    {statusMap[detailOpen.task?.status]?.label || detailOpen.task?.status}
                  </Badge>
                  {detailOpen.task?.due_date && (
                    <span className="text-xs text-muted-foreground">
                      📅 সময়সীমা: {new Date(detailOpen.task.due_date).toLocaleString("bn-BD")}
                    </span>
                  )}
                </div>
                {detailOpen.task?.description && (
                  <p className="text-sm whitespace-pre-wrap">{detailOpen.task.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>👤 অ্যাসাইন: {getProfileName(detailOpen.task?.assigned_to)}</span>
                  <span>📋 দ্বারা: {getProfileName(detailOpen.task?.assigned_by)}</span>
                </div>
                {detailOpen.task?.admin_note && (
                  <p className="text-xs bg-muted rounded p-2 italic">💬 নোট: {detailOpen.task.admin_note}</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {detailOpen.task?.due_date && detailOpen.task?.status !== "completed" && (
                  <Button size="sm" variant="outline" className="text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); setExtendOpen({ open: true, task: detailOpen.task }); setNewDueDate(""); }}>
                    <Clock className="h-3 w-3" /> সময় বাড়ান
                  </Button>
                )}
                {detailOpen.task?.status !== "completed" && (
                  <Button size="sm" variant="outline" className="text-xs gap-1"
                    onClick={(e) => { e.stopPropagation(); setReassignOpen({ open: true, task: detailOpen.task }); setReassignTo(""); }}>
                    <Users className="h-3 w-3" /> রিঅ্যাসাইন
                  </Button>
                )}
                {role === "super_admin" && detailOpen.task?.assigned_by !== userId && (
                  <Badge variant="outline" className="text-[10px]">সুপার অ্যাডমিন মডিফাই করতে পারবে</Badge>
                )}
              </div>

              {/* Reports section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> রিপোর্ট ({taskReports.length})
                </h3>
                {taskReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">কোন রিপোর্ট জমা হয়নি</p>
                ) : (
                  taskReports.map(report => (
                    <Card key={report.id}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">রিপোর্ট #{report.report_number}</span>
                          <Badge variant={report.status === "approved" ? "default" : report.status === "not_approved" ? "destructive" : "secondary"} className="text-[10px]">
                            {report.status === "approved" ? "অনুমোদিত" : report.status === "not_approved" ? "অননুমোদিত" : report.status === "resubmit" ? "পুনরায় জমা" : "অপেক্ষমাণ"}
                          </Badge>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{report.report_content}</p>
                        {/* Report images */}
                        {report.image_urls && report.image_urls.length > 0 && (
                          <div className="grid grid-cols-4 gap-2">
                            {report.image_urls.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`ছবি ${i + 1}`} className="rounded-lg border object-cover aspect-square w-full hover:opacity-80 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        )}
                        {report.admin_feedback && (
                          <p className="text-xs bg-muted rounded p-2 italic">💬 {report.admin_feedback}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          জমা: {new Date(report.created_at).toLocaleString("bn-BD")} · 👤 {getProfileName(report.submitted_by)}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>নতুন টাস্ক তৈরি</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="টাস্কের শিরোনাম"
              value={newTask.title}
              onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
            />
            <Textarea
              placeholder="বিবরণ (ঐচ্ছিক)"
              value={newTask.description}
              onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
              rows={3}
            />

            {/* Multiple user selection */}
            <div>
              <p className="text-sm font-medium mb-2">ইউজার নির্বাচন করুন ({selectedUsers.length} জন নির্বাচিত)</p>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {profiles.filter(p => p.user_id !== userId).map(p => (
                  <label key={p.user_id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent/30 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedUsers.includes(p.user_id)}
                      onCheckedChange={() => toggleUser(p.user_id)}
                    />
                    <span>{p.full_name}</span>
                    <span className="text-xs text-muted-foreground">@{p.username}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-1">সময়সীমা (ঐচ্ছিক)</p>
              <Input
                type="datetime-local"
                value={newTask.due_date}
                onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={saveTaskTemplate} disabled={!newTask.title} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> টেমপ্লেট সেভ
            </Button>
            <Button onClick={createTask} disabled={!newTask.title || selectedUsers.length === 0}>
              টাস্ক তৈরি করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved Tasks Dialog */}
      <Dialog open={savedTasksOpen} onOpenChange={setSavedTasksOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>সংরক্ষিত টাস্ক লিস্ট</DialogTitle>
          </DialogHeader>
          {savedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">কোন সংরক্ষিত টাস্ক নেই</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {savedTasks.map((t, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => loadTemplate(t)}>ব্যবহার</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteTemplate(i)}>✕</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Extend Due Date Dialog */}
      <Dialog open={extendOpen.open} onOpenChange={o => setExtendOpen({ open: o, task: o ? extendOpen.task : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>সময় বাড়ান</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">"{extendOpen.task?.title}" টাস্কের নতুন সময়সীমা</p>
          <Input type="datetime-local" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
          <DialogFooter>
            <Button onClick={extendDueDate} disabled={!newDueDate}>নিশ্চিত</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen.open} onOpenChange={o => setReassignOpen({ open: o, task: o ? reassignOpen.task : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>টাস্ক রিঅ্যাসাইন</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">"{reassignOpen.task?.title}" অন্য কাউকে দিন</p>
          <Select value={reassignTo} onValueChange={setReassignTo}>
            <SelectTrigger>
              <SelectValue placeholder="ইউজার নির্বাচন" />
            </SelectTrigger>
            <SelectContent>
              {profiles.filter(p => p.user_id !== userId && p.user_id !== reassignOpen.task?.assigned_to).map(p => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name} (@{p.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={reassignTask} disabled={!reassignTo}>রিঅ্যাসাইন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Activity Log Dialog - Super Admin Only */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" /> সকল টাস্ক কার্যকলাপ লগ
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">কোন টাস্ক নেই</p>
              ) : (
                tasks.map(task => {
                  const timeInfo = task.due_date ? getTimeRemaining(task.due_date) : null;
                  const reports = allReports.filter(r => r.task_id === task.id);
                  return (
                    <Card key={task.id} className={task.status === "completed" ? "opacity-70" : ""}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold">{task.title}</p>
                            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                          </div>
                          <Badge variant={statusMap[task.status]?.variant || "secondary"} className="text-[10px] shrink-0">
                            {statusMap[task.status]?.label || task.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>👤 প্রাপক: {getProfileName(task.assigned_to)}</span>
                          <span>📋 প্রেরক: {getProfileName(task.assigned_by)}</span>
                          <span>📆 তৈরি: {new Date(task.created_at).toLocaleDateString("bn-BD")}</span>
                          {task.due_date && (
                            <span className={timeInfo?.overdue && task.status !== "completed" ? "text-destructive font-medium" : ""}>
                              ⏰ সময়সীমা: {new Date(task.due_date).toLocaleString("bn-BD")}
                              {timeInfo && task.status !== "completed" && ` (${timeInfo.text})`}
                            </span>
                          )}
                        </div>
                        {task.admin_note && (
                          <p className="text-xs bg-muted rounded p-1.5 italic">💬 {task.admin_note}</p>
                        )}
                        {reports.length > 0 && (
                          <div className="border-t pt-2 space-y-1.5">
                            <p className="text-[10px] font-medium text-muted-foreground">রিপোর্ট ({reports.length}):</p>
                            {reports.map(r => (
                              <div key={r.id} className="bg-muted/50 rounded p-2 text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span>#{r.report_number}</span>
                                  <Badge variant={r.status === "approved" ? "default" : r.status === "not_approved" ? "destructive" : "secondary"} className="text-[9px] h-4">
                                    {r.status === "approved" ? "অনুমোদিত" : r.status === "not_approved" ? "অননুমোদিত" : r.status === "resubmit" ? "পুনরায় জমা" : "অপেক্ষমাণ"}
                                  </Badge>
                                </div>
                                <p className="text-muted-foreground line-clamp-2">{r.report_content}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(r.created_at).toLocaleString("bn-BD")} · {getProfileName(r.submitted_by)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskSection;
