import { useEffect, useState, useCallback } from "react";
import { FileText, CheckCircle2, Clock, XCircle, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "পেন্ডিং", icon: Clock, color: "text-amber-600", variant: "secondary" },
  approved: { label: "অনুমোদিত", icon: CheckCircle2, color: "text-primary", variant: "default" },
  rejected: { label: "প্রত্যাখ্যাত", icon: XCircle, color: "text-destructive", variant: "destructive" },
  resubmit: { label: "পুনরায় জমা", icon: RotateCcw, color: "text-amber-600", variant: "destructive" },
};

const ReportHistory = ({ userId }: Props) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("task_reports")
      .select("*, tasks(title, description)")
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setReports(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">লোড হচ্ছে...</div>;

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <FileText className="h-12 w-12 opacity-30" />
          <p className="text-sm">কোন রিপোর্ট জমা দেওয়া হয়নি</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" /> রিপোর্ট হিস্ট্রি
        <Badge variant="secondary" className="ml-auto">{reports.length} টি</Badge>
      </h2>

      {reports.map((report) => {
        const config = statusConfig[report.status] || statusConfig.pending;
        const StatusIcon = config.icon;
        const expanded = expandedId === report.id;

        return (
          <Card key={report.id} className="overflow-hidden">
            <CardContent className="p-0">
              <button
                className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : report.id)}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                  report.status === "approved" ? "bg-primary/10" :
                  report.status === "rejected" || report.status === "resubmit" ? "bg-destructive/10" :
                  "bg-amber-500/10"
                }`}>
                  <StatusIcon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{report.tasks?.title || "টাস্ক"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    #{report.report_number} • {new Date(report.created_at).toLocaleDateString("bn-BD", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Badge variant={config.variant} className="text-[10px] shrink-0">{config.label}</Badge>
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {expanded && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  <div className="pt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">রিপোর্ট:</p>
                    <p className="text-sm bg-muted rounded-md p-2">{report.report_content}</p>
                  </div>

                  {report.image_urls && report.image_urls.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">ছবি:</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {report.image_urls.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-md overflow-hidden border">
                            <img src={url} alt="" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.admin_feedback && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-2">
                      <p className="text-[10px] font-medium text-primary mb-0.5">অ্যাডমিন ফিডব্যাক:</p>
                      <p className="text-xs">{report.admin_feedback}</p>
                    </div>
                  )}
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
