import { useEffect, useState } from "react";
import { DollarSign, Plus, Search, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  bonus: number;
  deductions: number;
  net_salary: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  user_name?: string;
}

const PayrollModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [payUserId, setPayUserId] = useState("");
  const [month, setMonth] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [bonus, setBonus] = useState("0");
  const [deductions, setDeductions] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === "super_admin" || role === "admin";

  const fetchPayrolls = async () => {
    setLoading(true);
    let query = supabase.from("payrolls" as any).select("*").order("created_at", { ascending: false }).limit(100);
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
    if (!payUserId || !month || !basicSalary) return;
    const basic = parseFloat(basicSalary);
    const bon = parseFloat(bonus) || 0;
    const ded = parseFloat(deductions) || 0;
    setSubmitting(true);
    const { error } = await (supabase.from("payrolls" as any) as any).insert({
      user_id: payUserId,
      month,
      basic_salary: basic,
      bonus: bon,
      deductions: ded,
      net_salary: basic + bon - ded,
      status: "pending",
      created_by: userId,
    });
    if (error) {
      toast({ title: "Failed to create payroll", variant: "destructive" });
    } else {
      toast({ title: "Payroll record created!" });
      setCreateOpen(false);
      setPayUserId("");
      setMonth("");
      setBasicSalary("");
      setBonus("0");
      setDeductions("0");
      fetchPayrolls();
    }
    setSubmitting(false);
  };

  const markPaid = async (id: string) => {
    await (supabase.from("payrolls" as any) as any).update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Marked as paid" });
    fetchPayrolls();
  };

  const exportCSV = () => {
    let csv = "Name,Month,Basic,Bonus,Deductions,Net Salary,Status\n";
    payrolls.forEach(p => {
      csv += `"${p.user_name}","${p.month}",${p.basic_salary},${p.bonus},${p.deductions},${p.net_salary},"${p.status}"\n`;
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
    !search || p.user_name?.toLowerCase().includes(search.toLowerCase())
  );

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
                <Plus className="h-4 w-4" /> Add
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
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
          <Card key={p.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{p.user_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.month} · Basic: {p.basic_salary.toLocaleString()}
                    {p.bonus > 0 && ` + Bonus: ${p.bonus.toLocaleString()}`}
                    {p.deductions > 0 && ` - Ded: ${p.deductions.toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-semibold text-sm text-primary">{p.net_salary.toLocaleString()}</span>
                  {p.status === "paid" ? (
                    <Badge variant="secondary" className="text-[10px]">Paid</Badge>
                  ) : isAdmin ? (
                    <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markPaid(p.id)}>
                      Mark Paid
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Pending</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Payroll</DialogTitle>
            <DialogDescription>Create a payroll record for a staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={payUserId} onValueChange={setPayUserId}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staffList.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Month (e.g. March 2026)" value={month} onChange={e => setMonth(e.target.value)} />
            <Input type="number" placeholder="Basic salary" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Bonus" value={bonus} onChange={e => setBonus(e.target.value)} />
              <Input type="number" placeholder="Deductions" value={deductions} onChange={e => setDeductions(e.target.value)} />
            </div>
            {basicSalary && (
              <p className="text-sm font-medium text-primary text-center">
                Net: {((parseFloat(basicSalary) || 0) + (parseFloat(bonus) || 0) - (parseFloat(deductions) || 0)).toLocaleString()}
              </p>
            )}
            <Button onClick={handleCreate} disabled={submitting || !payUserId || !month || !basicSalary} className="w-full">
              {submitting ? "Creating..." : "Create Payroll"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollModule;
