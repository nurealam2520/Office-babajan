import { useEffect, useState, useCallback, useRef, forwardRef } from "react";
import { DollarSign, Plus, Search, Download, Eye, Settings, Calendar, Zap, ChevronDown, ChevronUp, Trash2, Save, Printer, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO, differenceInMinutes, differenceInHours } from "date-fns";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "staff";
}

interface Payroll {
  id: string;
  user_id: string;
  month: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  bonus: number;
  overtime_hours: number;
  overtime_rate: number;
  tax_deduction: number;
  loan_deduction: number;
  advance_deduction: number;
  penalty_deduction: number;
  other_deductions: number;
  net_salary: number;
  status: string;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  user_name?: string;
}

interface PayrollSettings {
  id: string;
  office_start_time: string;
  office_end_time: string;
  weekly_off_day: string;
  late_threshold_minutes: number;
  late_days_for_penalty: number;
  penalty_days_deducted: number;
  default_overtime_rate: number;
}

interface Holiday {
  id: string;
  holiday_date: string;
  name: string;
  year: number;
}

interface StaffProfile {
  user_id: string;
  full_name: string;
  basic_salary: number;
  overtime_rate_per_hour: number;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "Pending", class: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    processing: { label: "Processing", class: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    paid: { label: "Paid", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  };
  const s = map[status] || { label: status, class: "" };
  return <Badge className={`text-[10px] ${s.class}`} variant="outline">{s.label}</Badge>;
};

const fmtNum = (n: number) => Math.round(n).toLocaleString("en-BD");

const PayrollModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const isAdmin = role === "super_admin" || role === "admin";
  const isSuperAdmin = role === "super_admin";

  // State
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailPayroll, setDetailPayroll] = useState<Payroll | null>(null);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activeTab, setActiveTab] = useState("payrolls");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    printRef.current.classList.remove("hidden");
    window.print();
    setTimeout(() => printRef.current?.classList.add("hidden"), 500);
  };

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    office_start_time: "09:00", office_end_time: "18:00", weekly_off_day: "friday",
    late_threshold_minutes: "15", late_days_for_penalty: "3", penalty_days_deducted: "1",
    default_overtime_rate: "100",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Holiday form
  const [holidayForm, setHolidayForm] = useState({ holiday_date: "", name: "", year: new Date().getFullYear().toString() });
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());

  // Staff salary form
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [staffSalaryForm, setStaffSalaryForm] = useState({ basic_salary: "", overtime_rate_per_hour: "" });

  // Generate payroll
  const [genMonth, setGenMonth] = useState((new Date().getMonth()).toString()); // prev month
  const [genYear, setGenYear] = useState(new Date().getFullYear().toString());
  const [generating, setGenerating] = useState(false);
  const [genPreview, setGenPreview] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    // Fetch payrolls
    let query = supabase.from("payrolls").select("*").order("created_at", { ascending: false }).limit(200);
    if (role === "staff") query = query.eq("user_id", userId);
    const { data: payrollData } = await query;

    // Fetch profiles
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, basic_salary, overtime_rate_per_hour");
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
    setStaffList((profiles as StaffProfile[]) || []);

    setPayrolls(((payrollData as any[]) || []).map(p => ({
      ...p,
      user_name: profileMap.get(p.user_id) || "Unknown",
    })));

    // Fetch settings
    const { data: settingsData } = await supabase.from("payroll_settings").select("*").limit(1);
    if (settingsData && settingsData.length > 0) {
      const s = settingsData[0] as any;
      setSettings(s);
      setSettingsForm({
        office_start_time: s.office_start_time?.substring(0, 5) || "09:00",
        office_end_time: s.office_end_time?.substring(0, 5) || "18:00",
        weekly_off_day: s.weekly_off_day,
        late_threshold_minutes: String(s.late_threshold_minutes),
        late_days_for_penalty: String(s.late_days_for_penalty),
        penalty_days_deducted: String(s.penalty_days_deducted),
        default_overtime_rate: String(s.default_overtime_rate),
      });
    }

    // Fetch holidays
    const { data: holidaysData } = await supabase.from("government_holidays").select("*").order("holiday_date", { ascending: true });
    setHolidays((holidaysData as any[]) || []);

    setLoading(false);
  }, [userId, role]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Save settings
  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase.from("payroll_settings").update({
      office_start_time: settingsForm.office_start_time + ":00",
      office_end_time: settingsForm.office_end_time + ":00",
      weekly_off_day: settingsForm.weekly_off_day,
      late_threshold_minutes: parseInt(settingsForm.late_threshold_minutes) || 15,
      late_days_for_penalty: parseInt(settingsForm.late_days_for_penalty) || 3,
      penalty_days_deducted: parseInt(settingsForm.penalty_days_deducted) || 1,
      default_overtime_rate: parseFloat(settingsForm.default_overtime_rate) || 0,
    } as any).eq("id", settings.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Settings saved ✅" }); fetchAll(); }
    setSavingSettings(false);
  };

  // Save staff salary
  const saveStaffSalary = async (staffUserId: string) => {
    const { error } = await supabase.from("profiles").update({
      basic_salary: parseFloat(staffSalaryForm.basic_salary) || 0,
      overtime_rate_per_hour: parseFloat(staffSalaryForm.overtime_rate_per_hour) || 0,
    } as any).eq("user_id", staffUserId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Salary updated ✅" }); setEditingStaff(null); fetchAll(); }
  };

  // Add holiday
  const addHoliday = async () => {
    if (!holidayForm.holiday_date || !holidayForm.name) return;
    setAddingHoliday(true);
    const { error } = await supabase.from("government_holidays").insert({
      holiday_date: holidayForm.holiday_date,
      name: holidayForm.name,
      year: parseInt(holidayForm.year) || new Date().getFullYear(),
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Holiday added ✅" }); setHolidayForm({ holiday_date: "", name: "", year: holidayForm.year }); fetchAll(); }
    setAddingHoliday(false);
  };

  const deleteHoliday = async (id: string) => {
    await supabase.from("government_holidays").delete().eq("id", id);
    toast({ title: "Holiday removed" });
    fetchAll();
  };

  // Generate auto payroll
  const generatePayroll = async () => {
    if (!settings) { toast({ title: "Please configure settings first", variant: "destructive" }); return; }
    setGenerating(true);

    const month = parseInt(genMonth);
    const year = parseInt(genYear);
    const monthStart = startOfMonth(new Date(year, month));
    const monthEnd = endOfMonth(new Date(year, month));
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const monthLabel = `${MONTHS[month]} ${year}`;

    // Get weekly off day index
    const offDayIndex = DAY_NAMES.indexOf(settings.weekly_off_day);

    // Holiday dates set
    const holidayDates = new Set(
      holidays
        .filter(h => h.year === year)
        .map(h => h.holiday_date)
    );

    // Working days
    const workingDays = allDays.filter(d => {
      if (getDay(d) === offDayIndex) return false;
      if (holidayDates.has(format(d, "yyyy-MM-dd"))) return false;
      return true;
    });
    const totalWorkingDays = workingDays.length;

    // Parse office times
    const [startH, startM] = (settings.office_start_time || "09:00:00").split(":").map(Number);
    const [endH, endM] = (settings.office_end_time || "18:00:00").split(":").map(Number);
    const officeMinutesPerDay = (endH * 60 + endM) - (startH * 60 + startM);

    // Fetch attendance for all staff for this month
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("*")
      .gte("check_in", monthStart.toISOString())
      .lte("check_in", monthEnd.toISOString());

    const preview: any[] = [];

    for (const staff of staffList) {
      if (staff.basic_salary <= 0) continue; // skip staff without salary set

      const staffAttendance = (attendanceData || []).filter((a: any) => a.user_id === staff.user_id);
      const presentDays = staffAttendance.length;

      // Count late entries
      let lateDays = 0;
      let totalOvertimeMinutes = 0;

      for (const att of staffAttendance) {
        const checkIn = new Date(att.check_in);
        const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
        const officeStartMinutes = startH * 60 + startM;

        if (checkInMinutes > officeStartMinutes + (settings.late_threshold_minutes || 15)) {
          lateDays++;
        }

        // Overtime from checkout
        if (att.check_out) {
          const checkOut = new Date(att.check_out);
          const checkOutMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();
          const officeEndMinutes = endH * 60 + endM;
          if (checkOutMinutes > officeEndMinutes) {
            totalOvertimeMinutes += (checkOutMinutes - officeEndMinutes);
          }
        }
      }

      const overtimeHours = Math.round(totalOvertimeMinutes / 60 * 100) / 100;
      const otRate = staff.overtime_rate_per_hour || settings.default_overtime_rate || 0;

      // Late penalty calculation: every X late days = Y days salary deducted
      const penaltyDays = Math.floor(lateDays / (settings.late_days_for_penalty || 3)) * (settings.penalty_days_deducted || 1);
      const dailySalary = staff.basic_salary / totalWorkingDays;
      const penaltyAmount = Math.round(penaltyDays * dailySalary);

      // Absent days
      const absentDays = totalWorkingDays - presentDays;
      const absentDeduction = Math.round(absentDays * dailySalary);

      const overtimePay = Math.round(overtimeHours * otRate);
      const netSalary = staff.basic_salary - absentDeduction - penaltyAmount + overtimePay;

      preview.push({
        user_id: staff.user_id,
        full_name: staff.full_name,
        month: monthLabel,
        basic_salary: staff.basic_salary,
        total_working_days: totalWorkingDays,
        present_days: presentDays,
        absent_days: absentDays,
        late_days: lateDays,
        penalty_days: penaltyDays,
        penalty_amount: penaltyAmount,
        absent_deduction: absentDeduction,
        overtime_hours: overtimeHours,
        overtime_rate: otRate,
        overtime_pay: overtimePay,
        net_salary: Math.max(0, netSalary),
      });
    }

    setGenPreview(preview);
    setGenerating(false);
  };

  const confirmGeneratePayroll = async () => {
    setGenerating(true);
    let success = 0;
    for (const p of genPreview) {
      const { error } = await supabase.from("payrolls").insert({
        user_id: p.user_id,
        created_by: userId,
        month: p.month,
        basic_salary: p.basic_salary,
        overtime_hours: p.overtime_hours,
        overtime_rate: p.overtime_rate,
        penalty_deduction: p.penalty_amount,
        other_deductions: p.absent_deduction,
        net_salary: p.net_salary,
        status: "pending",
        note: `Auto: ${p.present_days}/${p.total_working_days} present, ${p.late_days} late, ${p.absent_days} absent, OT ${p.overtime_hours}h`,
      } as any);
      if (!error) success++;
    }
    toast({ title: `${success} payroll records generated ✅` });
    setGenPreview([]);
    fetchAll();
    setGenerating(false);
  };

  const markPaid = async (id: string) => {
    await supabase.from("payrolls").update({ status: "paid", paid_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Marked as paid ✅" });
    fetchAll();
  };

  const markProcessing = async (id: string) => {
    await supabase.from("payrolls").update({ status: "processing" } as any).eq("id", id);
    toast({ title: "Status → Processing" });
    fetchAll();
  };

  const exportCSV = () => {
    let csv = "Name,Month,Basic,OT Hours,OT Rate,Penalty,Other Ded,Net Salary,Status\n";
    payrolls.forEach(p => {
      csv += `"${p.user_name}","${p.month}",${p.basic_salary},${p.overtime_hours},${p.overtime_rate},${p.penalty_deduction},${p.other_deductions},${p.net_salary},"${p.status}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = payrolls.filter(p =>
    !search || p.user_name?.toLowerCase().includes(search.toLowerCase()) || p.month.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHolidays = holidays.filter(h => h.year === holidayYear);

  if (loading) return <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>;

  // Staff view - only payrolls tab
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">My Payslips</h2>
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No payslip records yet</p>
          </div>
        ) : (
          filtered.map(p => (
            <PayrollCard key={p.id} payroll={p} isAdmin={false} onMarkPaid={() => {}} onMarkProcessing={() => {}} onViewDetail={() => setDetailPayroll(p)} />
          ))
        )}
        <Dialog open={!!detailPayroll} onOpenChange={() => setDetailPayroll(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Payslip Details</DialogTitle>
              <DialogDescription>{detailPayroll?.user_name} — {detailPayroll?.month}</DialogDescription>
            </DialogHeader>
            {detailPayroll && <PayslipDetail payroll={detailPayroll} />}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Payroll Management</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="payrolls" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> Payrolls</TabsTrigger>
          <TabsTrigger value="generate" className="text-xs gap-1"><Zap className="h-3 w-3" /> Generate</TabsTrigger>
          <TabsTrigger value="holidays" className="text-xs gap-1"><Calendar className="h-3 w-3" /> Holidays</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1"><Settings className="h-3 w-3" /> Settings</TabsTrigger>
        </TabsList>

        {/* PAYROLLS TAB */}
        <TabsContent value="payrolls" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={handlePrint} title="Print">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={handlePrint} title="PDF">
              <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={exportCSV}>
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No payroll records. Go to Generate tab to create.</p>
            </div>
          ) : (
            filtered.map(p => (
              <PayrollCard key={p.id} payroll={p} isAdmin onMarkPaid={() => markPaid(p.id)} onMarkProcessing={() => markProcessing(p.id)} onViewDetail={() => setDetailPayroll(p)} />
            ))
          )}
        </TabsContent>

        {/* GENERATE TAB */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">⚡ Auto Generate Payroll</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Payroll will be auto-generated from attendance data. Each staff member's basic salary must be set in their profile.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Month</Label>
                  <Select value={genMonth} onValueChange={setGenMonth}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Year</Label>
                  <Input type="number" value={genYear} onChange={e => setGenYear(e.target.value)} className="h-9" />
                </div>
              </div>
              <Button onClick={generatePayroll} disabled={generating} className="w-full gap-1">
                <Zap className="h-4 w-4" /> {generating ? "Calculating..." : "Preview Payroll"}
              </Button>

              {genPreview.length > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <p className="text-xs font-semibold">Preview ({genPreview.length} employees)</p>
                  {genPreview.map(p => (
                    <Card key={p.user_id} className="p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-sm">{p.full_name}</p>
                        <span className="font-bold text-sm text-primary">৳{fmtNum(p.net_salary)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[10px]">
                        <div className="bg-muted/50 rounded p-1 text-center">
                          <p className="text-muted-foreground">Present</p>
                          <p className="font-medium">{p.present_days}/{p.total_working_days}</p>
                        </div>
                        <div className="bg-muted/50 rounded p-1 text-center">
                          <p className="text-muted-foreground">Absent</p>
                          <p className="font-medium text-destructive">{p.absent_days}</p>
                        </div>
                        <div className="bg-muted/50 rounded p-1 text-center">
                          <p className="text-muted-foreground">Late</p>
                          <p className="font-medium text-amber-600">{p.late_days}</p>
                        </div>
                        <div className="bg-muted/50 rounded p-1 text-center">
                          <p className="text-muted-foreground">OT</p>
                          <p className="font-medium text-emerald-600">{p.overtime_hours}h</p>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground space-y-0.5">
                        <p>Basic: ৳{fmtNum(p.basic_salary)} | Absent Ded: −৳{fmtNum(p.absent_deduction)} | Late Penalty ({p.penalty_days}d): −৳{fmtNum(p.penalty_amount)} | OT: +৳{fmtNum(p.overtime_pay)}</p>
                      </div>
                    </Card>
                  ))}
                  <Button onClick={confirmGeneratePayroll} disabled={generating} className="w-full">
                    {generating ? "Saving..." : `Confirm & Create ${genPreview.length} Payrolls`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff Salary Setup */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">💰 Staff Salary Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Set Basic Salary and Overtime Rate for each staff member.</p>
              {staffList.map(s => (
                <div key={s.user_id} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm flex-1 min-w-0 truncate">{s.full_name}</span>
                  {editingStaff === s.user_id ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" placeholder="Salary" value={staffSalaryForm.basic_salary} onChange={e => setStaffSalaryForm(p => ({ ...p, basic_salary: e.target.value }))} className="h-7 w-20 text-xs" />
                      <Input type="number" placeholder="OT/hr" value={staffSalaryForm.overtime_rate_per_hour} onChange={e => setStaffSalaryForm(p => ({ ...p, overtime_rate_per_hour: e.target.value }))} className="h-7 w-16 text-xs" />
                      <Button size="sm" className="h-7 w-7 p-0" onClick={() => saveStaffSalary(s.user_id)}><Save className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">৳{fmtNum(s.basic_salary)} | OT ৳{fmtNum(s.overtime_rate_per_hour)}/hr</span>
                      {isSuperAdmin && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                          setEditingStaff(s.user_id);
                          setStaffSalaryForm({ basic_salary: String(s.basic_salary), overtime_rate_per_hour: String(s.overtime_rate_per_hour) });
                        }}>Edit</Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOLIDAYS TAB */}
        <TabsContent value="holidays" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">🏛️ Government Holidays (Bangladesh)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs shrink-0">Year:</Label>
                <Select value={String(holidayYear)} onValueChange={v => setHolidayYear(parseInt(v))}>
                  <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {filteredHolidays.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No holidays for {holidayYear}</p>
              ) : (
                <div className="space-y-1">
                  {filteredHolidays.map(h => (
                    <div key={h.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                      <div>
                        <p className="font-medium">{h.name}</p>
                        <p className="text-muted-foreground">{format(parseISO(h.holiday_date), "dd MMM yyyy, EEEE")}</p>
                      </div>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteHoliday(h.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold">Add Holiday</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="date" value={holidayForm.holiday_date} onChange={e => setHolidayForm(p => ({ ...p, holiday_date: e.target.value }))} className="h-8 text-xs" />
                    <Input placeholder="Holiday name" value={holidayForm.name} onChange={e => setHolidayForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs" />
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={addHoliday} disabled={addingHoliday}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">⚙️ Payroll Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">🕐 Office Hours</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Start Time</Label>
                    <Input type="time" value={settingsForm.office_start_time} onChange={e => setSettingsForm(p => ({ ...p, office_start_time: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">End Time</Label>
                    <Input type="time" value={settingsForm.office_end_time} onChange={e => setSettingsForm(p => ({ ...p, office_end_time: e.target.value }))} className="h-9" />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">📅 Weekly Off Day</p>
                <Select value={settingsForm.weekly_off_day} onValueChange={v => setSettingsForm(p => ({ ...p, weekly_off_day: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map(d => <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">⏰ Late Entry Rules</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Threshold (min)</Label>
                    <Input type="number" value={settingsForm.late_threshold_minutes} onChange={e => setSettingsForm(p => ({ ...p, late_threshold_minutes: e.target.value }))} className="h-8 text-sm" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Late after this many minutes</p>
                  </div>
                  <div>
                    <Label className="text-[11px]">Late Days</Label>
                    <Input type="number" value={settingsForm.late_days_for_penalty} onChange={e => setSettingsForm(p => ({ ...p, late_days_for_penalty: e.target.value }))} className="h-8 text-sm" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Late days to trigger penalty</p>
                  </div>
                  <div>
                    <Label className="text-[11px]">Penalty Days</Label>
                    <Input type="number" value={settingsForm.penalty_days_deducted} onChange={e => setSettingsForm(p => ({ ...p, penalty_days_deducted: e.target.value }))} className="h-8 text-sm" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Salary days deducted</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 bg-muted/50 rounded p-1.5">
                  📌 Example: Late after {settingsForm.late_threshold_minutes} min. {settingsForm.late_days_for_penalty} late days = {settingsForm.penalty_days_deducted} day(s) salary deducted.
                </p>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">⏱️ Default Overtime Rate</p>
                <div>
                  <Label className="text-xs">Rate per Hour (৳)</Label>
                  <Input type="number" value={settingsForm.default_overtime_rate} onChange={e => setSettingsForm(p => ({ ...p, default_overtime_rate: e.target.value }))} className="h-9" />
                </div>
              </div>

              <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailPayroll} onOpenChange={() => setDetailPayroll(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>{detailPayroll?.user_name} — {detailPayroll?.month}</DialogDescription>
          </DialogHeader>
          {detailPayroll && <PayslipDetail payroll={detailPayroll} />}
        </DialogContent>
      </Dialog>

      {/* Print View */}
      <PayrollPrintView ref={printRef} payrolls={filtered} />
    </div>
  );
};

/** Individual payroll card */
const PayrollCard = ({ payroll: p, isAdmin, onMarkPaid, onMarkProcessing, onViewDetail }: {
  payroll: Payroll; isAdmin: boolean; onMarkPaid: () => void; onMarkProcessing: () => void; onViewDetail: () => void;
}) => {
  const totalDeductions = p.penalty_deduction + p.other_deductions + p.tax_deduction + p.loan_deduction + p.advance_deduction;
  const overtimePay = p.overtime_hours * p.overtime_rate;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{p.user_name}</p>
            <p className="text-[11px] text-muted-foreground">{p.month}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-bold text-sm text-primary">৳{fmtNum(p.net_salary)}</span>
            {statusBadge(p.status)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded bg-muted/50 p-1.5 text-center">
            <p className="text-muted-foreground">Basic</p>
            <p className="font-medium">৳{fmtNum(p.basic_salary)}</p>
          </div>
          <div className="rounded bg-emerald-500/5 p-1.5 text-center">
            <p className="text-muted-foreground">OT Pay</p>
            <p className="font-medium text-emerald-600">+৳{fmtNum(overtimePay)}</p>
          </div>
          <div className="rounded bg-destructive/5 p-1.5 text-center">
            <p className="text-muted-foreground">Deductions</p>
            <p className="font-medium text-destructive">−৳{fmtNum(totalDeductions)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onViewDetail}>
            <Eye className="h-3.5 w-3.5" /> Details
          </Button>
          <div className="flex gap-1">
            {isAdmin && p.status === "pending" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onMarkProcessing}>Processing</Button>
            )}
            {isAdmin && (p.status === "pending" || p.status === "processing") && (
              <Button size="sm" className="h-7 text-xs" onClick={onMarkPaid}>Mark Paid</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/** Detailed payslip view */
const PayslipDetail = ({ payroll: p }: { payroll: Payroll }) => {
  const overtime = p.overtime_hours * p.overtime_rate;
  const totalEarnings = p.basic_salary + overtime + p.bonus + p.housing_allowance + p.transport_allowance + p.medical_allowance + p.other_allowances;
  const totalDeductions = p.tax_deduction + p.loan_deduction + p.advance_deduction + p.penalty_deduction + p.other_deductions;

  const Row = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
    <div className={`flex justify-between text-xs ${bold ? "font-bold text-sm" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={color || ""}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-emerald-600">💰 Earnings</p>
        <Row label="Basic Salary" value={`৳${fmtNum(p.basic_salary)}`} />
        {overtime > 0 && <Row label={`Overtime (${p.overtime_hours}h × ৳${fmtNum(p.overtime_rate)})`} value={`৳${fmtNum(overtime)}`} />}
        {p.bonus > 0 && <Row label="Bonus" value={`৳${fmtNum(p.bonus)}`} />}
        {p.housing_allowance > 0 && <Row label="Housing" value={`৳${fmtNum(p.housing_allowance)}`} />}
        {p.transport_allowance > 0 && <Row label="Transport" value={`৳${fmtNum(p.transport_allowance)}`} />}
        {p.medical_allowance > 0 && <Row label="Medical" value={`৳${fmtNum(p.medical_allowance)}`} />}
        <Separator />
        <Row label="Total Earnings" value={`৳${fmtNum(totalEarnings)}`} bold color="text-emerald-600" />
      </div>

      {totalDeductions > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-destructive">📉 Deductions</p>
          {p.penalty_deduction > 0 && <Row label="Late Penalty" value={`−৳${fmtNum(p.penalty_deduction)}`} color="text-destructive" />}
          {p.other_deductions > 0 && <Row label="Absent Deduction" value={`−৳${fmtNum(p.other_deductions)}`} color="text-destructive" />}
          {p.tax_deduction > 0 && <Row label="Tax" value={`−৳${fmtNum(p.tax_deduction)}`} color="text-destructive" />}
          {p.loan_deduction > 0 && <Row label="Loan" value={`−৳${fmtNum(p.loan_deduction)}`} color="text-destructive" />}
          {p.advance_deduction > 0 && <Row label="Advance" value={`−৳${fmtNum(p.advance_deduction)}`} color="text-destructive" />}
          <Separator />
          <Row label="Total Deductions" value={`−৳${fmtNum(totalDeductions)}`} bold color="text-destructive" />
        </div>
      )}

      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
        <Row label="Net Pay" value={`৳${fmtNum(p.net_salary)}`} bold color="text-primary" />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          {statusBadge(p.status)}
        </div>
        {p.paid_at && <span className="text-muted-foreground">Paid: {new Date(p.paid_at).toLocaleDateString("en-US")}</span>}
      </div>

      {p.note && (
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Note</p>
          <p className="text-xs">{p.note}</p>
        </div>
      )}
    </div>
  );
};

export default PayrollModule;
