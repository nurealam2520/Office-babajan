import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Task } from "./TaskCard";

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: { user_id: string; full_name: string }[];
}

const EditTaskDialog = ({ task, open, onOpenChange, staffList }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    label: "",
    due_date: "",
    planned_date: "",
    budget: "",
    credit_line: "",
    t_security: "",
    task_number: "",
    category: "",
    admin_note: "",
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        assigned_to: task.assigned_to || "",
        label: task.label || "none",
        due_date: task.due_date ? task.due_date.slice(0, 16) : "",
        planned_date: task.planned_date ? task.planned_date.slice(0, 16) : "",
        budget: task.budget != null ? String(task.budget) : "",
        credit_line: task.credit_line || "",
        t_security: task.t_security != null ? String(task.t_security) : "",
        task_number: task.task_number || "",
        category: task.category || "",
        admin_note: task.admin_note || "",
      });
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").update({
      title: form.title,
      description: form.description || null,
      assigned_to: form.assigned_to,
      label: form.label === "none" ? null : form.label,
      due_date: form.due_date || null,
      admin_note: form.admin_note || null,
    } as any).eq("id", task.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task updated ✅" });
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task {form.task_number ? `#${form.task_number}` : ""}</DialogTitle>
          <DialogDescription>Update task details</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Assign To</Label>
              <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Label</Label>
              <Select value={form.label} onValueChange={v => setForm(f => ({ ...f, label: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Label</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="advance">Advance</SelectItem>
                  <SelectItem value="waiting_for_goods">Waiting for the Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Planned Date</Label>
              <Input type="datetime-local" value={form.planned_date} onChange={e => setForm(f => ({ ...f, planned_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Budget</Label>
              <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Credit Line</Label>
              <Input value={form.credit_line} onChange={e => setForm(f => ({ ...f, credit_line: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">T. Security</Label>
              <Input type="number" value={form.t_security} onChange={e => setForm(f => ({ ...f, t_security: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Task ID</Label>
              <Input value={form.task_number} onChange={e => setForm(f => ({ ...f, task_number: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Remark / Note</Label>
            <Textarea rows={2} value={form.admin_note} onChange={e => setForm(f => ({ ...f, admin_note: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskDialog;
