import { useState } from "react";
import { Pencil, User, Calendar, Clock, AlertTriangle, FileText, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  in_progress: { label: "চলমান", variant: "default" },
  completed: { label: "সম্পন্ন", variant: "outline" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive" },
};

interface TaskDetailDialogProps {
  task: any;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  getProfileName: (uid: string) => string;
  canEdit?: boolean;
  canDelete?: boolean;
}

const TaskDetailDialog = ({ task, open, onClose, onUpdated, getProfileName, canEdit = true, canDelete = false }: TaskDetailDialogProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    due_date: task?.due_date ? task.due_date.split("T")[0] : "",
    admin_note: task?.admin_note || "",
    status: task?.status || "pending",
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("tasks").update({
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      admin_note: form.admin_note || null,
      status: form.status,
    }).eq("id", task.id);
    if (error) {
      toast({ title: "ত্রুটি হয়েছে", variant: "destructive" });
    } else {
      toast({ title: "আপডেট হয়েছে ✓" });
      setEditing(false);
      onUpdated();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("এই টাস্কটি ডিলিট করতে চান?")) return;
    await supabase.from("tasks").delete().eq("id", task.id);
    toast({ title: "টাস্ক ডিলিট হয়েছে" });
    onClose();
    onUpdated();
  };

  if (!task) return null;

  const getTimeInfo = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return { overdue: true, text: "সময় শেষ" };
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    return { overdue: false, text: days > 0 ? `${days}দি ${hrs % 24}ঘ বাকি` : `${hrs}ঘ বাকি` };
  };

  const timeInfo = task.due_date ? getTimeInfo(task.due_date) : null;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            {editing ? "টাস্ক সম্পাদনা" : "টাস্ক বিস্তারিত"}
          </DialogTitle>
        </DialogHeader>

        {editing ? (
          <div className="space-y-3">
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="টাইটেল" />
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="বিবরণ" rows={3} />
            <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusMap).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea value={form.admin_note} onChange={e => setForm(p => ({ ...p, admin_note: e.target.value }))} placeholder="অ্যাডমিন নোট" rows={2} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{task.title}</h3>
              <Badge variant={statusMap[task.status]?.variant || "secondary"}>
                {statusMap[task.status]?.label || task.status}
              </Badge>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>অ্যাসাইনড: {getProfileName(task.assigned_to)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>অ্যাসাইন করেছেন: {getProfileName(task.assigned_by)}</span>
              </div>
              {task.due_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>ডেডলাইন: {new Date(task.due_date).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
              )}
              {timeInfo && task.status !== "completed" && (
                <div className={`flex items-center gap-2 ${timeInfo.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                  {timeInfo.overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  <span className="font-medium">{timeInfo.text}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <span>তৈরি: {new Date(task.created_at).toLocaleString("bn-BD")}</span>
              </div>
            </div>

            {task.admin_note && (
              <div className="bg-muted p-2.5 rounded text-sm italic">💬 {task.admin_note}</div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1" /> বাতিল</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> সংরক্ষণ</Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> সম্পাদনা
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                  ডিলিট
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailDialog;
