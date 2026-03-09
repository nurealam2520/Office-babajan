import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, CheckCircle, XCircle, Search, Users, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  note: string | null;
  source: string;
  user_name?: string;
}

interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  user_name?: string;
  leave_type_name?: string;
}

type SortKey = "user_name" | "check_in" | "check_out" | "source" | "status" | "total";
type SortDir = "asc" | "desc";

const COLUMNS = [
  { key: "user_name", label: "Staff Name", sortable: true, minWidth: 140 },
  { key: "check_in", label: "Check In", sortable: true, minWidth: 100 },
  { key: "check_out", label: "Check Out", sortable: true, minWidth: 100 },
  { key: "total", label: "Total", sortable: true, minWidth: 80 },
  { key: "source", label: "Source", sortable: true, minWidth: 80 },
  { key: "status", label: "Status", sortable: true, minWidth: 80 },
  { key: "note", label: "Note", sortable: false, minWidth: 120 },
];

const ResizableHeader = ({ children, width, onResize }: { children: React.ReactNode; width: number; onResize: (delta: number) => void }) => {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = width;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX.current;
    onResize(delta);
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <TableHead style={{ width, minWidth: width, position: "relative" }} className="select-none">
      {children}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/20 flex items-center justify-center"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
      </div>
    </TableHead>
  );
};

const InlineEditCell = ({
  value,
  onSave,
  type = "text",
}: {
  value: string;
  onSave: (val: string) => void;
  type?: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (editValue !== value) onSave(editValue);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="h-7 text-xs"
      />
    );
  }

  return (
    <div
      onDoubleClick={() => { setEditValue(value); setEditing(true); }}
      className="cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded min-h-[24px] text-xs"
      title="Double-click to edit"
    >
      {value || "—"}
    </div>
  );
};

const AttendanceAdmin = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("attendance");
  const [sortKey, setSortKey] = useState<SortKey>("check_in");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.minWidth));

  const [actionDialog, setActionDialog] = useState<{ open: boolean; request: LeaveRequest | null; action: string }>({
    open: false, request: null, action: "",
  });
  const [adminNote, setAdminNote] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: att }, { data: prof }, { data: leaves }] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .gte("check_in", selectedDate)
        .lt("check_in", new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split("T")[0])
        .order("check_in", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name"),
      supabase
        .from("leave_requests" as any)
        .select("*, leave_types(name)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const profileMap = new Map<string, string>();
    prof?.forEach((p) => profileMap.set(p.user_id, p.full_name));
    setProfiles(profileMap);

    setAttendance(
      ((att as any[]) || []).map((a: any) => ({ ...a, user_name: profileMap.get(a.user_id) || "Unknown" }))
    );
    setLeaveRequests(
      ((leaves as any[]) || []).map((l: any) => ({
        ...l,
        user_name: profileMap.get(l.user_id) || "Unknown",
        leave_type_name: l.leave_types?.name || "General",
      }))
    );
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleResize = (index: number, delta: number) => {
    setColWidths(prev => {
      const newWidths = [...prev];
      newWidths[index] = Math.max(COLUMNS[index].minWidth, prev[index] + delta);
      return newWidths;
    });
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    const { error } = await supabase.from("attendance").update({ [field]: value || null } as any).eq("id", id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else { toast({ title: "Updated ✓" }); fetchData(); }
  };

  const handleLeaveAction = async (action: "approved" | "rejected") => {
    if (!actionDialog.request) return;
    const { error } = await (supabase.from("leave_requests" as any) as any)
      .update({
        status: action,
        approved_by: userId,
        admin_note: adminNote || null,
      })
      .eq("id", actionDialog.request.id);

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Leave ${action} ✅` });
      setActionDialog({ open: false, request: null, action: "" });
      setAdminNote("");
      fetchData();
    }
  };

  const getTotal = (rec: AttendanceRecord): string => {
    if (!rec.check_out) return "—";
    const d = new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime();
    return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
  };

  const sortedAttendance = [...attendance]
    .filter((a) => !searchQuery || a.user_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "user_name": cmp = (a.user_name || "").localeCompare(b.user_name || ""); break;
        case "check_in": cmp = new Date(a.check_in).getTime() - new Date(b.check_in).getTime(); break;
        case "check_out": cmp = (a.check_out || "").localeCompare(b.check_out || ""); break;
        case "source": cmp = a.source.localeCompare(b.source); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "total":
          const ta = a.check_out ? new Date(a.check_out).getTime() - new Date(a.check_in).getTime() : 0;
          const tb = b.check_out ? new Date(b.check_out).getTime() - new Date(b.check_in).getTime() : 0;
          cmp = ta - tb;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending");
  const processedLeaves = leaveRequests.filter((l) => l.status !== "pending");

  const totalPresent = attendance.length;
  const totalCheckedOut = attendance.filter((a) => a.check_out).length;

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Attendance & Leave</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="attendance" className="gap-1">
            <Users className="h-3.5 w-3.5" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Leave Requests
            {pendingLeaves.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">{pendingLeaves.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 w-full sm:w-auto"
            />
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-primary">{totalPresent}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-emerald-500">{totalCheckedOut}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-amber-500">{totalPresent - totalCheckedOut}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          ) : sortedAttendance.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No attendance records</p>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                  <TableRow>
                    {COLUMNS.map((col, i) => (
                      <ResizableHeader key={col.key} width={colWidths[i]} onResize={(d) => handleResize(i, d)}>
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold ${col.sortable ? "cursor-pointer hover:text-primary" : ""}`}
                          onClick={() => col.sortable && handleSort(col.key as SortKey)}
                        >
                          {col.label}
                          {col.sortable && <SortIcon col={col.key} />}
                        </div>
                      </ResizableHeader>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAttendance.map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-medium">{rec.user_name}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(rec.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {rec.check_out
                          ? new Date(rec.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{getTotal(rec)}</TableCell>
                      <TableCell>
                        <Badge variant={rec.source === "device" ? "default" : "secondary"} className="text-[9px]">
                          {rec.source === "device" ? "🔒 Device" : "📱 App"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rec.check_out ? "secondary" : "default"} className="text-[9px]">
                          {rec.check_out ? "Done" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <InlineEditCell
                          value={rec.note || ""}
                          onSave={(val) => handleInlineUpdate(rec.id, "note", val)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaves" className="space-y-3">
          {pendingLeaves.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-500">Pending Approvals ({pendingLeaves.length})</h3>
              {pendingLeaves.map((req) => {
                const days = Math.ceil((new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / 86400000) + 1;
                return (
                  <Card key={req.id} className="border-amber-500/30">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{req.user_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {req.leave_type_name} • {new Date(req.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" → "}{new Date(req.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" "}({days}d)
                          </p>
                          {req.reason && <p className="text-xs text-muted-foreground mt-1">{req.reason}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-emerald-500 hover:text-emerald-600"
                            onClick={() => { setActionDialog({ open: true, request: req, action: "approved" }); setAdminNote(""); }}
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-destructive"
                            onClick={() => { setActionDialog({ open: true, request: req, action: "rejected" }); setAdminNote(""); }}
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {processedLeaves.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">History</h3>
              {processedLeaves.map((req) => {
                const days = Math.ceil((new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / 86400000) + 1;
                const isApproved = req.status === "approved";
                return (
                  <Card key={req.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{req.user_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {req.leave_type_name} • {days}d •{" "}
                            {new Date(req.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <Badge variant={isApproved ? "secondary" : "destructive"} className="text-[10px]">
                          {isApproved ? "✅ Approved" : "❌ Rejected"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {pendingLeaves.length === 0 && processedLeaves.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No leave requests</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={actionDialog.open} onOpenChange={(o) => setActionDialog({ ...actionDialog, open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionDialog.action === "approved" ? "Approve" : "Reject"} Leave</DialogTitle>
            <DialogDescription>
              {actionDialog.request?.user_name}'s leave request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Note (optional)</label>
              <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} placeholder="Add a note..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog({ open: false, request: null, action: "" })}>Cancel</Button>
              <Button
                variant={actionDialog.action === "approved" ? "default" : "destructive"}
                onClick={() => handleLeaveAction(actionDialog.action as "approved" | "rejected")}
              >
                {actionDialog.action === "approved" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceAdmin;
