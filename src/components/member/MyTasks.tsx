import { useEffect, useState, useCallback } from "react";
import { ClipboardList, Clock, AlertTriangle, FileText, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  in_progress: { label: "কাজ চলছে", variant: "default" },
  completed: { label: "সম্পন্ন", variant: "outline" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive" },
};

const MyTasks = ({ userId }: Props) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState<{ open: boolean; task: any }>({ open: false, task: null });
  const [reportContent, setReportContent] = useState("");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const getTimeRemaining = (dueDate: string) => {
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return { text: "সময় শেষ!", overdue: true, percent: 100 };
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(hrs / 24);
    if (days > 0) return { text: `${days} দিন ${hrs % 24} ঘণ্টা বাকি`, overdue: false, percent: Math.max(0, 100 - (diff / (7 * 86400000)) * 100) };
    return { text: `${hrs} ঘণ্টা বাকি`, overdue: false, percent: Math.min(90, 100 - (diff / 86400000) * 100) };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (reportImages.length + files.length > 5) {
      toast({ title: "সর্বোচ্চ ৫টি ছবি", variant: "destructive" });
      return;
    }
    setReportImages(prev => [...prev, ...files].slice(0, 5));
  };

  const removeImage = (index: number) => {
    setReportImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitReport = async () => {
    if (!reportOpen.task || !reportContent.trim()) return;
    setSubmitting(true);

    try {
      // Upload images
      const imageUrls: string[] = [];
      for (const file of reportImages) {
        const path = `${userId}/${reportOpen.task.id}_${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("report-images").upload(path, file);
        if (!error) {
          const { data } = supabase.storage.from("report-images").getPublicUrl(path);
          imageUrls.push(data.publicUrl);
        }
      }

      // Accept task if pending
      if (reportOpen.task.status === "pending") {
        await supabase.from("tasks").update({ status: "in_progress" }).eq("id", reportOpen.task.id);
      }

      const { error } = await supabase.from("task_reports").insert({
        task_id: reportOpen.task.id,
        submitted_by: userId,
        report_content: reportContent,
        image_urls: imageUrls,
      });

      if (error) throw error;

      toast({ title: "সফল", description: "রিপোর্ট জমা হয়েছে" });
      setReportOpen({ open: false, task: null });
      setReportContent("");
      setReportImages([]);
      fetchTasks();
    } catch {
      toast({ title: "ত্রুটি", description: "রিপোর্ট জমা দিতে সমস্যা", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const acceptTask = async (task: any) => {
    await supabase.from("tasks").update({ status: "in_progress" }).eq("id", task.id);
    toast({ title: "টাস্ক গ্রহণ করা হয়েছে" });
    fetchTasks();
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  const activeTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-primary" /> আমার টাস্ক
        <Badge variant="secondary" className="ml-auto">{activeTasks.length} সক্রিয়</Badge>
      </h2>

      {activeTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 opacity-30" />
            <p className="text-sm">কোন সক্রিয় টাস্ক নেই</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {activeTasks.map(task => {
            const timeInfo = task.due_date ? getTimeRemaining(task.due_date) : null;
            return (
              <Card key={task.id} className={timeInfo?.overdue ? "border-destructive/50" : ""}>
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
                  {task.admin_note && (
                    <p className="text-xs bg-muted rounded p-2 italic">💬 {task.admin_note}</p>
                  )}
                  {timeInfo && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px]">
                        {timeInfo.overdue ? <AlertTriangle className="h-3 w-3 text-destructive" /> : <Clock className="h-3 w-3" />}
                        <span className={timeInfo.overdue ? "text-destructive font-medium" : "text-muted-foreground"}>{timeInfo.text}</span>
                      </div>
                      <Progress value={timeInfo.percent} className="h-1" />
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {task.status === "pending" && (
                      <Button size="sm" variant="default" className="text-xs h-7" onClick={() => acceptTask(task)}>
                        গ্রহণ করুন
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                      onClick={() => { setReportOpen({ open: true, task }); setReportContent(""); setReportImages([]); }}>
                      <FileText className="h-3 w-3" /> রিপোর্ট দিন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">সম্পন্ন টাস্ক ({completedTasks.length})</h3>
          {completedTasks.slice(0, 3).map(task => (
            <Card key={task.id} className="opacity-60">
              <CardContent className="py-3 flex items-center justify-between">
                <span className="text-sm">{task.title}</span>
                <Badge variant="outline" className="text-[10px]">সম্পন্ন</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Dialog */}
      <Dialog open={reportOpen.open} onOpenChange={o => setReportOpen({ open: o, task: o ? reportOpen.task : null })}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>রিপোর্ট জমা দিন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">{reportOpen.task?.title}</p>
              {reportOpen.task?.description && <p className="text-xs text-muted-foreground mt-1">{reportOpen.task.description}</p>}
            </div>

            <Textarea
              placeholder="বিস্তারিত রিপোর্ট লিখুন..."
              value={reportContent}
              onChange={e => setReportContent(e.target.value)}
              rows={5}
            />

            {/* Image Upload */}
            <div className="space-y-2">
              <p className="text-sm font-medium">ছবি সংযুক্ত করুন (সর্বোচ্চ ৫টি)</p>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                disabled={reportImages.length >= 5}
              />
              {reportImages.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {reportImages.map((file, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl text-xs px-1.5 py-0.5"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitReport} disabled={!reportContent.trim() || submitting} className="gap-2">
              <Send className="h-4 w-4" /> {submitting ? "জমা হচ্ছে..." : "জমা দিন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTasks;
