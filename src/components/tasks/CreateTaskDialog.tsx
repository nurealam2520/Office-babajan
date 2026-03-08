import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const LABELS = ["live", "advance", "waiting_for_goods"] as const;

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  assigned_to: z.string().min(1, "Select an assignee"),
  priority: z.string().default("medium"),
  status: z.string().default("pending"),
  label: z.string().optional(),
  due_date: z.string().optional(),
  planned_date: z.string().optional(),
  budget: z.string().optional(),
  credit_line: z.string().optional(),
  t_security: z.string().optional(),
  task_number: z.string().optional(),
  category: z.string().optional(),
  admin_note: z.string().optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: () => void;
}

const STATUSES = [
  "pending", "in_progress", "completed", "cancelled", "issues", "processing", "ready_to_bid", "bidded",
];

const CreateTaskDialog = ({ open, onOpenChange, userId, onCreated }: Props) => {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "", description: "", assigned_to: "", priority: "medium",
      status: "pending", label: "", due_date: "", planned_date: "", budget: "",
      credit_line: "", t_security: "", task_number: "", category: "", admin_note: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    const fetchStaff = async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("is_active", true);
      setStaffList(data || []);
    };
    fetchStaff();
  }, [open]);

  const onSubmit = async (data: TaskForm) => {
    setSubmitting(true);
    const { error } = await supabase.from("tasks").insert({
      title: data.title,
      description: data.description || null,
      assigned_to: data.assigned_to,
      assigned_by: userId,
      inputter_id: userId,
      priority: data.priority,
      label: data.label || null,
      status: data.status,
      due_date: data.due_date || null,
      planned_date: data.planned_date || null,
      budget: data.budget ? parseFloat(data.budget) : null,
      credit_line: data.credit_line || null,
      t_security: data.t_security ? parseFloat(data.t_security) : null,
      task_number: data.task_number || null,
      category: data.category || null,
      admin_note: data.admin_note || null,
    } as any);

    if (error) {
      toast({ title: "Error creating task", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task created ✅" });
      form.reset();
      onOpenChange(false);
      onCreated();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Fill in the task details below</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Title *</FormLabel>
                  <FormControl><Input placeholder="Task title" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="assigned_to" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffList.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="task_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Task ID</FormLabel>
                  <FormControl><Input placeholder="e.g. T-001" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="planned_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Date</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="budget" render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="credit_line" render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Line</FormLabel>
                  <FormControl><Input placeholder="Credit line" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="t_security" render={({ field }) => (
                <FormItem>
                  <FormLabel>T. Security</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl><Input placeholder="e.g. Tender, Internal" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Task description..." rows={3} {...field} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="admin_note" render={({ field }) => (
              <FormItem>
                <FormLabel>Remark / Note</FormLabel>
                <FormControl><Textarea placeholder="Additional notes..." rows={2} {...field} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Task"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
