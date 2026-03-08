import { useEffect, useState } from "react";
import { CalendarDays, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  leave_type_name?: string;
}

interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
  is_paid: boolean;
}

interface Props {
  userId: string;
}

const LeaveManagement = ({ userId }: Props) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const fetchData = async () => {
    const [{ data: lr }, { data: lt }] = await Promise.all([
      supabase
        .from("leave_requests")
        .select("*, leave_types(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("leave_types").select("*").eq("is_active", true),
    ]);
    setRequests(
      (lr || []).map((r: any) => ({
        ...r,
        leave_type_name: r.leave_types?.name || "General",
      }))
    );
    setLeaveTypes(lt || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleApply = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Select start and end dates", variant: "destructive" });
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast({ title: "End date must be after start date", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leave_requests").insert({
      user_id: userId,
      leave_type_id: selectedType || null,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    } as any);

    if (error) {
      toast({ title: "Failed to apply", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Leave request submitted ✅" });
      setApplyOpen(false);
      setSelectedType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      fetchData();
    }
    setSubmitting(false);
  };

  const statusInfo: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "Pending", icon: Clock, color: "text-amber-500" },
    approved: { label: "Approved", icon: CheckCircle, color: "text-emerald-500" },
    rejected: { label: "Rejected", icon: XCircle, color: "text-destructive" },
  };

  if (loading) return <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Leave Requests</span>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setApplyOpen(true)}>
          <Plus className="h-4 w-4" /> Apply Leave
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No leave requests yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => {
            const info = statusInfo[req.status] || statusInfo.pending;
            const Icon = info.icon;
            const days = Math.ceil(
              (new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / 86400000
            ) + 1;
            return (
              <Card key={req.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{req.leave_type_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(req.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" → "}
                        {new Date(req.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        <span className="ml-1">({days} day{days > 1 ? "s" : ""})</span>
                      </p>
                    </div>
                    <Badge variant="outline" className={`gap-1 shrink-0 ${info.color}`}>
                      <Icon className="h-3 w-3" />
                      {info.label}
                    </Badge>
                  </div>
                  {req.reason && <p className="text-xs text-muted-foreground">{req.reason}</p>}
                  {req.admin_note && (
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Admin Note</p>
                      <p className="text-xs">{req.admin_note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Apply Leave Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>Fill in leave details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {leaveTypes.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Leave Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name} ({lt.days_allowed} days{lt.is_paid ? ", paid" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
              <Textarea placeholder="Reason for leave..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
              <Button onClick={handleApply} disabled={submitting || !startDate || !endDate}>
                {submitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagement;
