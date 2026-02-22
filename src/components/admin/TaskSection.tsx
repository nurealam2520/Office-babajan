import { useEffect, useState, useCallback } from "react";
import { Plus, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin";
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  in_progress: { label: "চলমান", variant: "default" },
  completed: { label: "সম্পন্ন", variant: "outline" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive" },
};

const TaskSection = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", assigned_to: "", due_date: "" });

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

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const createTask = async () => {
    if (!newTask.title || !newTask.assigned_to) return;
    const { error } = await supabase.from("tasks").insert({
      assigned_by: userId,
      assigned_to: newTask.assigned_to,
      title: newTask.title,
      description: newTask.description || null,
      due_date: newTask.due_date || null,
    });
    if (error) {
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "টাস্ক তৈরি হয়েছে" });
      setNewTask({ title: "", description: "", assigned_to: "", due_date: "" });
      setCreateOpen(false);
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">টাস্ক ম্যানেজমেন্ট</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> নতুন টাস্ক
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
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
          {tasks.map(task => (
            <Card key={task.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{task.title}</CardTitle>
                  <Badge variant={statusMap[task.status]?.variant || "secondary"}>
                    {statusMap[task.status]?.label || task.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>👤 {getProfileName(task.assigned_to)}</span>
                  {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString("bn-BD")}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  তৈরি: {new Date(task.created_at).toLocaleDateString("bn-BD")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
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
            <Select value={newTask.assigned_to} onValueChange={v => setNewTask(p => ({ ...p, assigned_to: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="ইউজার নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name} (@{p.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newTask.due_date}
              onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button onClick={createTask}>টাস্ক তৈরি করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskSection;
