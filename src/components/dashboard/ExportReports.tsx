import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}

type ReportType = "tasks" | "attendance" | "users";

const ExportReports = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<ReportType>("tasks");
  const [exporting, setExporting] = useState(false);

  const exportCSV = async () => {
    setExporting(true);
    try {
      let csvContent = "";
      let filename = "";

      if (reportType === "tasks") {
        const { data: tasks } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        csvContent = "Title,Status,Assigned To,Due Date,Created At\n";
        (tasks || []).forEach(t => {
          csvContent += `"${t.title}","${t.status}","${profileMap.get(t.assigned_to) || "Unknown"}","${t.due_date ? format(new Date(t.due_date), "yyyy-MM-dd") : "N/A"}","${format(new Date(t.created_at), "yyyy-MM-dd")}"\n`;
        });
        filename = `tasks_report_${format(new Date(), "yyyyMMdd")}.csv`;
      }

      if (reportType === "attendance") {
        const since = subDays(new Date(), 30).toISOString();
        const { data: att } = await supabase.from("attendance").select("*").gte("check_in", since).order("check_in", { ascending: false });
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

        csvContent = "User,Check In,Check Out,Status,Note\n";
        (att || []).forEach(a => {
          csvContent += `"${profileMap.get(a.user_id) || "Unknown"}","${format(new Date(a.check_in), "yyyy-MM-dd HH:mm")}","${a.check_out ? format(new Date(a.check_out), "yyyy-MM-dd HH:mm") : "Active"}","${a.status}","${a.note || ""}"\n`;
        });
        filename = `attendance_report_${format(new Date(), "yyyyMMdd")}.csv`;
      }

      if (reportType === "users") {
        const { data: profiles } = await supabase.from("profiles").select("*");
        const { data: roles } = await supabase.from("user_roles").select("user_id, role");
        const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

        csvContent = "Name,Username,Mobile,Role,Active,Joined\n";
        (profiles || []).forEach(p => {
          csvContent += `"${p.full_name}","${p.username}","${p.country_code}${p.mobile_number}","${roleMap.get(p.user_id) || "staff"}","${p.is_active ? "Yes" : "No"}","${format(new Date(p.created_at), "yyyy-MM-dd")}"\n`;
        });
        filename = `users_report_${format(new Date(), "yyyyMMdd")}.csv`;
      }

      // Download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Report exported successfully!" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
    setExporting(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Export Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks">Tasks Report</SelectItem>
              <SelectItem value="attendance">Attendance Report (30 days)</SelectItem>
              <SelectItem value="users">Users Report</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} disabled={exporting} className="gap-1">
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportReports;
