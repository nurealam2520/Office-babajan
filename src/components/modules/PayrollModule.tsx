import { useEffect, useState } from "react";
import { DollarSign, Plus, Search, Download, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: "Pending", class: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
    processing: { label: "Processing", class: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    paid: { label: "Paid", class: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  };
  const s = map[status] || { label: status, class: "" };
  return <Badge className={`text-[10px] ${s.class}`} variant="outline">{s.label}</Badge>;
};

const calcTotals = (f: Record<string, string>) => {
  const basic = parseFloat(f.basic_salary) || 0;
  const housing = parseFloat(f.housing_allowance) || 0;
  const transport = parseFloat(f.transport_allowance) || 0;
  const medical = parseFloat(f.medical_allowance) || 0;
  const otherAllow = parseFloat(f.other_allowances) || 0;
  const bonus = parseFloat(f.bonus) || 0;
  const otHours = parseFloat(f.overtime_hours) || 0;
  const otRate = parseFloat(f.overtime_rate) || 0;
  const overtime = otHours * otRate;

  const totalEarnings = basic + housing + transport + medical + otherAllow + bonus + overtime;

  const tax = parseFloat(f.tax_deduction) || 0;
  const loan = parseFloat(f.loan_deduction) || 0;
  const advance = parseFloat(f.advance_deduction) || 0;
  const penalty = parseFloat(f.penalty_deduction) || 0;
  const otherDed = parseFloat(f.other_deductions) || 0;
  const totalDeductions = tax + loan + advance + penalty + otherDed;

  return { totalEarnings, totalDeductions, net: totalEarnings - totalDeductions, overtime };
};

const fmtNum = (n: number) => n.toLocaleString("en-BD");

const PayrollModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPayroll, setDetailPayroll] = useState<Payroll | null>(null);
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === "super_admin" || role === "admin";

  const emptyForm = {
    user_id: "", month: "", basic_salary: "", housing_allowance: "0", transport_allowance: "0",
    medical_allowance: "0", other_allowances: "0", bonus: "0", overtime_hours: "0", overtime_rate: "0",
    tax_deduction: "0", loan_deduction: "0", advance_deduction: "0", penalty_deduction: "0",
    other_deductions: "0", note: "",
  };
  const [form, setForm] = useState(emptyForm);
  const setField = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const fetchPayrolls = async () => {
    setLoading(true);
    let query = supabase.from("payrolls").select("*").order("created_at", { ascending: false }).limit(100);
    if (role === "staff") query = query.eq("user_id", userId);
    const { data } = await query;
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
    setStaffList(profiles || []);
    setPayrolls(((data as any[]) || []).map(p => ({
      ...p,
      user_name: profileMap.get(p.user_id) || "Unknown",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPayrolls(); }, []);

  const handleCreate = async () => {
    if (!form.user_id || !form.month || !form.basic_salary) return;
    const { net, overtime } = calcTotals(form);
    setSubmitting(true);
    const { error } = await supabase.from("payrolls").insert({
      user_id: form.user_id,
      created_by: userId,
      month: form.month,
      basic_salary: parseFloat(form.basic_salary) || 0,
      housing_allowance: parseFloat(form.housing_allowance) || 0,
      transport_allowance: parseFloat(form.transport_allowance) || 0,
      medical_allowance: parseFloat(form.medical_allowance) || 0,
      other_allowances: parseFloat(form.other_allowances) || 0,
      bonus: parseFloat(form.bonus) || 0,
      overtime_hours: parseFloat(form.overtime_hours) || 0,
      overtime_rate: parseFloat(form.overtime_rate) || 0,
      tax_deduction: parseFloat(form.tax_deduction) || 0,
      loan_deduction: parseFloat(form.loan_deduction) || 0,
      advance_deduction: parseFloat(form.advance_deduction) || 0,
      penalty_deduction: parseFloat(form.penalty_deduction) || 0,
      other_deductions: parseFloat(form.other_deductions) || 0,
      net_salary: net,
      note: form.note || null,
      status: "pending",
    } as any);
    if (error) {
      toast({ title: "Failed to create payroll", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payroll record created! ✅" });
      setCreateOpen(false);
      setForm(emptyForm);
      fetchPayrolls();
    }
    setSubmitting(false);
  };

  const markPaid = async (id: string) => {
    await supabase.from("payrolls").update({ status: "paid", paid_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Marked as paid ✅" });
    fetchPayrolls();
  };

  const markProcessing = async (id: string) => {
    await supabase.from("payrolls").update({ status: "processing" } as any).eq("id", id);
    toast({ title: "Status → Processing" });
    fetchPayrolls();
  };

  const exportCSV = () => {
    let csv = "Name,Month,Basic,Housing,Transport,Medical,Other Allow,Bonus,OT Hours,OT Rate,Tax,Loan,Advance,Penalty,Other Ded,Net Salary,Status\n";
    payrolls.forEach(p => {
      csv += `"${p.user_name}","${p.month}",${p.basic_salary},${p.housing_allowance},${p.transport_allowance},${p.medical_allowance},${p.other_allowances},${p.bonus},${p.overtime_hours},${p.overtime_rate},${p.tax_deduction},${p.loan_deduction},${p.advance_deduction},${p.penalty_deduction},${p.other_deductions},${p.net_salary},"${p.status}"\n`;
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

  const totals = calcTotals(form);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payroll</h2>
        <div className="flex gap-1">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
                <Download className="h-4 w-4" /> Export
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add Payroll
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or month..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No payroll records</p>
        </div>
      ) : (
        filtered.map(p => (
          <PayrollCard
            key={p.id}
            payroll={p}
            isAdmin={isAdmin}
            onMarkPaid={() => markPaid(p.id)}
            onMarkProcessing={() => markProcessing(p.id)}
            onViewDetail={() => setDetailPayroll(p)}
          />
        ))
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Payroll</DialogTitle>
            <DialogDescription>Create a comprehensive payroll record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Staff & Month */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Staff *</Label>
                <Select value={form.user_id} onValueChange={v => setField("user_id", v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staffList.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Month *</Label>
                <Input placeholder="e.g. March 2026" value={form.month} onChange={e => setField("month", e.target.value)} className="h-9" />
              </div>
            </div>

            <Separator />

            {/* Basic Salary */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">💰 Basic Salary</p>
              <div>
                <Label className="text-xs">Basic Salary *</Label>
                <Input type="number" placeholder="0" value={form.basic_salary} onChange={e => setField("basic_salary", e.target.value)} className="h-9" />
              </div>
            </div>

            <Separator />

            {/* Allowances */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">🏠 Allowances</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Housing</Label>
                  <Input type="number" placeholder="0" value={form.housing_allowance} onChange={e => setField("housing_allowance", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Transport</Label>
                  <Input type="number" placeholder="0" value={form.transport_allowance} onChange={e => setField("transport_allowance", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Medical</Label>
                  <Input type="number" placeholder="0" value={form.medical_allowance} onChange={e => setField("medical_allowance", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Other</Label>
                  <Input type="number" placeholder="0" value={form.other_allowances} onChange={e => setField("other_allowances", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Bonus */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">🎁 Bonus</p>
              <Input type="number" placeholder="0" value={form.bonus} onChange={e => setField("bonus", e.target.value)} className="h-9" />
            </div>

            <Separator />

            {/* Overtime */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">⏰ Overtime</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Hours</Label>
                  <Input type="number" placeholder="0" value={form.overtime_hours} onChange={e => setField("overtime_hours", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Rate/Hr</Label>
                  <Input type="number" placeholder="0" value={form.overtime_rate} onChange={e => setField("overtime_rate", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              {totals.overtime > 0 && <p className="text-[11px] text-muted-foreground mt-1">OT Total: ৳{fmtNum(totals.overtime)}</p>}
            </div>

            <Separator />

            {/* Deductions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">📉 Deductions</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Tax</Label>
                  <Input type="number" placeholder="0" value={form.tax_deduction} onChange={e => setField("tax_deduction", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Loan</Label>
                  <Input type="number" placeholder="0" value={form.loan_deduction} onChange={e => setField("loan_deduction", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Advance</Label>
                  <Input type="number" placeholder="0" value={form.advance_deduction} onChange={e => setField("advance_deduction", e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-[11px]">Penalty</Label>
                  <Input type="number" placeholder="0" value={form.penalty_deduction} onChange={e => setField("penalty_deduction", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px]">Other Deductions</Label>
                  <Input type="number" placeholder="0" value={form.other_deductions} onChange={e => setField("other_deductions", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Note */}
            <div>
              <Label className="text-xs">Note (Optional)</Label>
              <Textarea placeholder="Any remarks..." rows={2} value={form.note} onChange={e => setField("note", e.target.value)} />
            </div>

            {/* Summary */}
            {form.basic_salary && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Earnings</span>
                  <span className="font-medium text-emerald-600">৳{fmtNum(totals.totalEarnings)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total Deductions</span>
                  <span className="font-medium text-destructive">−৳{fmtNum(totals.totalDeductions)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Net Pay</span>
                  <span className="text-primary">৳{fmtNum(totals.net)}</span>
                </div>
              </div>
            )}

            <Button onClick={handleCreate} disabled={submitting || !form.user_id || !form.month || !form.basic_salary} className="w-full">
              {submitting ? "Creating..." : "Create Payroll"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

/** Individual payroll card */
const PayrollCard = ({ payroll: p, isAdmin, onMarkPaid, onMarkProcessing, onViewDetail }: {
  payroll: Payroll; isAdmin: boolean; onMarkPaid: () => void; onMarkProcessing: () => void; onViewDetail: () => void;
}) => {
  const totalAllowances = p.housing_allowance + p.transport_allowance + p.medical_allowance + p.other_allowances;
  const totalDeductions = p.tax_deduction + p.loan_deduction + p.advance_deduction + p.penalty_deduction + p.other_deductions;

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
            <p className="text-muted-foreground">Allowances</p>
            <p className="font-medium text-emerald-600">+৳{fmtNum(totalAllowances)}</p>
          </div>
          <div className="rounded bg-destructive/5 p-1.5 text-center">
            <p className="text-muted-foreground">Deductions</p>
            <p className="font-medium text-destructive">−৳{fmtNum(totalDeductions)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onViewDetail}>
            <Eye className="h-3.5 w-3.5" /> View Details
          </Button>
          {isAdmin && p.status === "pending" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onMarkProcessing}>
              Processing
            </Button>
          )}
          {isAdmin && (p.status === "pending" || p.status === "processing") && (
            <Button size="sm" className="h-7 text-xs" onClick={onMarkPaid}>
              Mark Paid
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/** Detailed payslip view */
const PayslipDetail = ({ payroll: p }: { payroll: Payroll }) => {
  const overtime = p.overtime_hours * p.overtime_rate;
  const totalAllowances = p.housing_allowance + p.transport_allowance + p.medical_allowance + p.other_allowances;
  const totalEarnings = p.basic_salary + totalAllowances + p.bonus + overtime;
  const totalDeductions = p.tax_deduction + p.loan_deduction + p.advance_deduction + p.penalty_deduction + p.other_deductions;

  const Row = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
    <div className={`flex justify-between text-xs ${bold ? "font-bold text-sm" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={color || ""}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Earnings */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-emerald-600">💰 Earnings</p>
        <Row label="Basic Salary" value={`৳${fmtNum(p.basic_salary)}`} />
        {p.housing_allowance > 0 && <Row label="Housing Allowance" value={`৳${fmtNum(p.housing_allowance)}`} />}
        {p.transport_allowance > 0 && <Row label="Transport Allowance" value={`৳${fmtNum(p.transport_allowance)}`} />}
        {p.medical_allowance > 0 && <Row label="Medical Allowance" value={`৳${fmtNum(p.medical_allowance)}`} />}
        {p.other_allowances > 0 && <Row label="Other Allowances" value={`৳${fmtNum(p.other_allowances)}`} />}
        {p.bonus > 0 && <Row label="Bonus" value={`৳${fmtNum(p.bonus)}`} />}
        {overtime > 0 && <Row label={`Overtime (${p.overtime_hours}h × ৳${fmtNum(p.overtime_rate)})`} value={`৳${fmtNum(overtime)}`} />}
        <Separator />
        <Row label="Total Earnings" value={`৳${fmtNum(totalEarnings)}`} bold color="text-emerald-600" />
      </div>

      {/* Deductions */}
      {totalDeductions > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-destructive">📉 Deductions</p>
          {p.tax_deduction > 0 && <Row label="Tax" value={`−৳${fmtNum(p.tax_deduction)}`} color="text-destructive" />}
          {p.loan_deduction > 0 && <Row label="Loan" value={`−৳${fmtNum(p.loan_deduction)}`} color="text-destructive" />}
          {p.advance_deduction > 0 && <Row label="Advance" value={`−৳${fmtNum(p.advance_deduction)}`} color="text-destructive" />}
          {p.penalty_deduction > 0 && <Row label="Penalty" value={`−৳${fmtNum(p.penalty_deduction)}`} color="text-destructive" />}
          {p.other_deductions > 0 && <Row label="Other" value={`−৳${fmtNum(p.other_deductions)}`} color="text-destructive" />}
          <Separator />
          <Row label="Total Deductions" value={`−৳${fmtNum(totalDeductions)}`} bold color="text-destructive" />
        </div>
      )}

      {/* Net Pay */}
      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
        <Row label="Net Pay" value={`৳${fmtNum(p.net_salary)}`} bold color="text-primary" />
      </div>

      {/* Status & Meta */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          {statusBadge(p.status)}
        </div>
        {p.paid_at && (
          <span className="text-muted-foreground">
            Paid: {new Date(p.paid_at).toLocaleDateString("en-US")}
          </span>
        )}
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
