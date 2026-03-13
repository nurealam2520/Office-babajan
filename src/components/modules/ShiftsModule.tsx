import { useEffect, useState, useRef } from "react";
import { Clock, Plus, Calendar, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "staff" | "co_worker" | "co_worker_data_entry";
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

type SortKey = "user_name" | "shift_date" | "start_time" | "end_time" | "shift_type";
type SortDir = "asc" | "desc";

const COLUMNS = [
  { key: "user_name", label: "Staff", sortable: true, minWidth: 140 },
  { key: "shift_date", label: "Date", sortable: true, minWidth: 120 },
  { key: "start_time", label: "Start", sortable: true, minWidth: 80 },
  { key: "end_time", label: "End", sortable: true, minWidth: 80 },
  { key: "shift_type", label: "Type", sortable: true, minWidth: 90 },
  { key: "notes", label: "Notes", sortable: false, minWidth: 150 },
  { key: "actions", label: "", sortable: false, minWidth: 50 },
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
  const [sortKey, setSortKey] = useState<SortKey>("shift_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.minWidth));
  const isAdmin = role === "super_admin" || role === "admin" || role === "manager";

  const fetchShifts = async () => {
    setLoading(true);
    let query = supabase.from("shifts" as any).select("*").order("shift_date", { ascending: false }).limit(50);
    if (role === "staff" || role === "co_worker" || role === "co_worker_data_entry") {
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
    const { error } = await (supabase.from("shifts" as any) as any).update({ [field]: value || null }).eq("id", id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else { toast({ title: "Updated ✓" }); fetchShifts(); }
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("shifts" as any) as any).delete().eq("id", id);
    toast({ title: "Shift deleted" });
    fetchShifts();
  };

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

  const sortedShifts = [...shifts].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "user_name": cmp = (a.user_name || "").localeCompare(b.user_name || ""); break;
      case "shift_date": cmp = a.shift_date.localeCompare(b.shift_date); break;
      case "start_time": cmp = a.start_time.localeCompare(b.start_time); break;
      case "end_time": cmp = a.end_time.localeCompare(b.end_time); break;
      case "shift_type": cmp = a.shift_type.localeCompare(b.shift_type); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const typeColors: Record<string, string> = {
    morning: "bg-amber-500/10 text-amber-600",
    evening: "bg-blue-500/10 text-blue-600",
    night: "bg-violet-500/10 text-violet-600",
    custom: "bg-muted text-muted-foreground",
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
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
        <div className="border rounded-lg overflow-auto max-h-[70vh]">
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
              {sortedShifts.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{s.user_name}</TableCell>
                  <TableCell>
                    <InlineEditCell
                      value={s.shift_date}
                      onSave={(val) => handleInlineUpdate(s.id, "shift_date", val)}
                      type="date"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditCell
                      value={s.start_time}
                      onSave={(val) => handleInlineUpdate(s.id, "start_time", val)}
                      type="time"
                    />
                  </TableCell>
                  <TableCell>
                    <InlineEditCell
                      value={s.end_time}
                      onSave={(val) => handleInlineUpdate(s.id, "end_time", val)}
                      type="time"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${typeColors[s.shift_type] || ""}`}>
                      {s.shift_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <InlineEditCell value={s.notes || ""} onSave={(val) => handleInlineUpdate(s.id, "notes", val)} />
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
