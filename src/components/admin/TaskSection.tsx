import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardList, RefreshCw, Clock, Save, Users, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, username"),
    ]);
    setTasks(t || []);
    setProfiles(p || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load saved tasks from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("saved_task_templates");
    if (stored) setSavedTasks(JSON.parse(stored));
  }, []);

  const getProfileName = (uid: string) => {
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
      // Send notifications with reference_id for popup
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">টাস্ক ম্যানেজমেন্ট</h2>
        <div className="flex gap-2">
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
              <Card key={task.id} className={timeInfo?.overdue && task.status !== "completed" ? "border-destructive/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm">{task.title}</CardTitle>
                    <Badge variant={statusMap[task.status]?.variant || "secondary"} className="text-[10px]">
                      {statusMap[task.status]?.label || task.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
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
                  <div className="flex gap-1.5 pt-1">
                    {task.due_date && task.status !== "completed" && (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                        onClick={() => { setExtendOpen({ open: true, task }); setNewDueDate(""); }}>
                        <Clock className="h-3 w-3 mr-1" /> সময় বাড়ান
                      </Button>
                    )}
                    {task.status !== "completed" && (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                        onClick={() => { setReassignOpen({ open: true, task }); setReassignTo(""); }}>
                        <Users className="h-3 w-3 mr-1" /> রিঅ্যাসাইন
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    তৈরি: {new Date(task.created_at).toLocaleDateString("bn-BD")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
};

export default TaskSection;
