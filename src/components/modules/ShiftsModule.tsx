import { useEffect, useState } from "react";
import { Clock, Plus, Calendar } from "lucide-react";
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

interface Shift {
  id: string;
  user_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  notes: string | null;
  user_name?: string;
}

const ShiftsModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [shiftType, setShiftType] = useState("morning");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === "super_admin" || role === "admin" || role === "manager";

  const fetchShifts = async () => {
    setLoading(true);
    let query = supabase.from("shifts" as any).select("*").order("shift_date", { ascending: false }).limit(50);
    if (role === "staff") {
      query = query.eq("user_id", userId);
    }
    const { data } = await query;
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    setShifts(((data as any[]) || []).map(s => ({ ...s, user_name: profileMap.get(s.user_id) || "Unknown" })));
    setStaffList(profiles || []);
    setLoading(false);
  };

  useEffect(() => { fetchShifts(); }, []);

  const handleCreate = async () => {
    if (!assignTo || !shiftDate) return;
    setSubmitting(true);
    const { error } = await (supabase.from("shifts" as any) as any).insert({
      user_id: assignTo,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      shift_type: shiftType,
      notes: notes || null,
      created_by: userId,
    });
    if (error) {
      toast({ title: "Failed to create shift", variant: "destructive" });
    } else {
      toast({ title: "Shift assigned!" });
      setCreateOpen(false);
      setAssignTo("");
      setShiftDate("");
      setNotes("");
      fetchShifts();
    }
    setSubmitting(false);
  };

  const typeColors: Record<string, string> = {
    morning: "bg-amber-500/10 text-amber-600",
    evening: "bg-blue-500/10 text-blue-600",
    night: "bg-violet-500/10 text-violet-600",
    custom: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Shift Management</h2>
        {isAdmin && (
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Assign Shift
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : shifts.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No shifts scheduled</p>
        </div>
      ) : (
        shifts.map(s => (
          <Card key={s.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.user_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(s.shift_date), "EEE, MMM d")} · {s.start_time} - {s.end_time}
                </p>
                {s.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{s.notes}</p>}
              </div>
              <Badge variant="outline" className={`text-[10px] ${typeColors[s.shift_type] || ""}`}>
                {s.shift_type}
              </Badge>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Shift</DialogTitle>
            <DialogDescription>Schedule a shift for a staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staffList.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <Button onClick={handleCreate} disabled={submitting || !assignTo || !shiftDate} className="w-full">
              {submitting ? "Assigning..." : "Assign Shift"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftsModule;
