import { useEffect, useState } from "react";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Report {
  id: string;
  report_content: string;
  status: string;
  admin_feedback: string | null;
  created_at: string;
  task_title?: string;
}

interface Props {
  userId: string;
}

const ReportHistory = ({ userId }: Props) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("task_reports")
        .select("id, report_content, status, admin_feedback, created_at, tasks(title)")
        .eq("submitted_by", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      setReports(
        (data || []).map((r: any) => ({
          ...r,
          task_title: r.tasks?.title || "Task",
        }))
      );
      setLoading(false);
    };
    fetch();
  }, [userId]);

  const statusInfo = (status: string) => {
    const map: Record<string, { label: string; icon: any; color: string }> = {
      pending: { label: "Pending", icon: Clock, color: "text-amber-500" },
      approved: { label: "Approved", icon: CheckCircle, color: "text-primary" },
      rejected: { label: "Rejected", icon: XCircle, color: "text-destructive" },
    };
    return map[status] || map.pending;
  };

  if (loading) return <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>;

  if (reports.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">No reports found</p>;
  }

  return (
    <div className="space-y-3">
      {reports.map(report => {
        const info = statusInfo(report.status);
        const Icon = info.icon;
        return (
          <Card key={report.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{report.task_title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString("en-US")}
                  </p>
                </div>
                <Badge variant="outline" className={`gap-1 shrink-0 ${info.color}`}>
                  <Icon className="h-3 w-3" />
                  {info.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{report.report_content}</p>
              {report.admin_feedback && (
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Admin Feedback</p>
                  <p className="text-xs">{report.admin_feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReportHistory;
