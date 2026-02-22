import { useEffect, useState, useCallback } from "react";
import { FileText, CheckCircle, XCircle, RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  approved: { label: "অনুমোদিত", variant: "default" },
  not_approved: { label: "অননুমোদিত", variant: "destructive" },
  resubmit: { label: "পুনরায় জমা", variant: "outline" },
};

const ReportSection = ({ userId }: Props) => {
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; report: any; action: string }>({
    open: false, report: null, action: "",
  });
  const [feedback, setFeedback] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: t }, { data: p }] = await Promise.all([
      supabase.from("task_reports").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, title, assigned_to"),
      supabase.from("profiles").select("user_id, full_name, username"),
    ]);
    setReports(r || []);
    setTasks(t || []);
    setProfiles(p || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const getTaskTitle = (tid: string) => {
    const t = tasks.find(t => t.id === tid);
    return t ? t.title : "অজানা টাস্ক";
  };

  const handleAction = async (action: string, report: any) => {
    const updates: any = { status: action, admin_feedback: feedback || null };
    const { error } = await supabase.from("task_reports").update(updates).eq("id", report.id);

    if (action === "approved") {
      await supabase.from("tasks").update({ status: "completed" }).eq("id", report.task_id);
    } else if (action === "not_approved") {
      // Send notification
      const task = tasks.find(t => t.id === report.task_id);
      if (task) {
        await supabase.from("login_notifications").insert({
          target_user_id: report.submitted_by,
          message: `আপনার "${getTaskTitle(report.task_id)}" টাস্কের রিপোর্ট অনুমোদিত হয়নি। কারণ: ${feedback || "ভালোভাবে করুন, কাজ হয়নি।"}`,
          created_by: userId,
        });
      }
    } else if (action === "resubmit") {
      await supabase.from("tasks").update({ status: "resubmit", admin_note: feedback || null }).eq("id", report.task_id);
      await supabase.from("login_notifications").insert({
        target_user_id: report.submitted_by,
        message: `আপনার "${getTaskTitle(report.task_id)}" টাস্কে কিছু পরিবর্তন প্রয়োজন। ${feedback || ""}`,
        created_by: userId,
      });
    }

    if (error) {
      toast({ title: "ত্রুটি", variant: "destructive" });
    } else {
      toast({ title: "সফল", description: "রিপোর্ট আপডেট হয়েছে" });
      setActionDialog({ open: false, report: null, action: "" });
      setFeedback("");
      fetchData();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">রিপোর্ট ড্যাশবোর্ড</h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" /> রিফ্রেশ
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <FileText className="h-12 w-12" />
            <p>কোন রিপোর্ট নেই</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map(report => (
            <Card key={report.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{getTaskTitle(report.task_id)}</CardTitle>
                  <Badge variant={statusConfig[report.status]?.variant || "secondary"}>
                    {statusConfig[report.status]?.label || report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">👤 {getProfileName(report.submitted_by)}</p>
                <p className="text-sm whitespace-pre-wrap">{report.report_content}</p>
                {/* Report images */}
                {report.image_urls && report.image_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {report.image_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img src={url} alt={`ছবি ${i + 1}`} className="rounded-lg border object-cover aspect-square w-full hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  জমা: {new Date(report.created_at).toLocaleString("bn-BD")}
                </p>
                {report.admin_feedback && (
                  <p className="rounded-lg bg-muted p-2 text-sm italic">💬 {report.admin_feedback}</p>
                )}

                {report.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" className="gap-1"
                      onClick={() => setActionDialog({ open: true, report, action: "approved" })}>
                      <CheckCircle className="h-4 w-4" /> অনুমোদন
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1"
                      onClick={() => setActionDialog({ open: true, report, action: "not_approved" })}>
                      <XCircle className="h-4 w-4" /> বাতিল
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1"
                      onClick={() => setActionDialog({ open: true, report, action: "resubmit" })}>
                      <RotateCcw className="h-4 w-4" /> রি-টাস্ক
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={actionDialog.open} onOpenChange={o => setActionDialog(p => ({ ...p, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "approved" ? "রিপোর্ট অনুমোদন" :
                actionDialog.action === "not_approved" ? "রিপোর্ট বাতিল" : "রি-টাস্ক"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={actionDialog.action === "resubmit" ? "কী পরিবর্তন করতে হবে..." : "মন্তব্য (ঐচ্ছিক)"}
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant={actionDialog.action === "not_approved" ? "destructive" : "default"}
              onClick={() => actionDialog.report && handleAction(actionDialog.action, actionDialog.report)}
            >
              নিশ্চিত করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportSection;
