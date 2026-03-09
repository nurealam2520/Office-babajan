import { useEffect, useState, useRef } from "react";
import { Package, Plus, Search, Trash2, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
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
  role: "super_admin" | "admin" | "manager" | "staff";
}

interface Asset {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  assigned_to: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  created_at: string;
  assigned_name?: string;
}

type SortKey = "name" | "category" | "status" | "serial_number" | "assigned_name" | "purchase_date";
type SortDir = "asc" | "desc";

const ASSET_CATEGORIES = ["Laptop", "Phone", "Furniture", "Vehicle", "Equipment", "Other"];
const ASSET_STATUSES = ["available", "assigned", "maintenance", "retired"];

const COLUMNS = [
  { key: "name", label: "Asset Name", sortable: true, minWidth: 150 },
  { key: "description", label: "Description", sortable: false, minWidth: 150 },
  { key: "category", label: "Category", sortable: true, minWidth: 100 },
  { key: "serial_number", label: "Serial #", sortable: true, minWidth: 100 },
  { key: "status", label: "Status", sortable: true, minWidth: 100 },
  { key: "assigned_name", label: "Assigned To", sortable: true, minWidth: 120 },
  { key: "purchase_date", label: "Purchased", sortable: true, minWidth: 100 },
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

const AssetsModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [status, setStatus] = useState("available");
  const [assignTo, setAssignTo] = useState("");
  const [serial, setSerial] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.minWidth));
  const isAdmin = role === "super_admin" || role === "admin";

  const fetchAssets = async () => {
    setLoading(true);
    let query = supabase.from("assets" as any).select("*").order("created_at", { ascending: false });
    if (role === "staff") query = query.eq("assigned_to", userId);
    const { data } = await query;
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
    setStaffList(profiles || []);

    setAssets(((data as any[]) || []).map(a => ({
      ...a,
      assigned_name: a.assigned_to ? (profileMap.get(a.assigned_to) || "Unknown") : null,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchAssets(); }, []);

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
    const { error } = await (supabase.from("assets" as any) as any).update({ [field]: value || null }).eq("id", id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else { toast({ title: "Updated ✓" }); fetchAssets(); }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const { error } = await (supabase.from("assets" as any) as any).insert({
      name: name.trim(),
      description: description || null,
      category,
      status,
      assigned_to: assignTo && assignTo !== "none" ? assignTo : null,
      serial_number: serial || null,
      purchase_date: purchaseDate || null,
      created_by: userId,
    });
    if (error) {
      toast({ title: "Failed to add asset", variant: "destructive" });
    } else {
      toast({ title: "Asset added!" });
      setCreateOpen(false);
      setName("");
      setDescription("");
      setSerial("");
      setAssignTo("");
      fetchAssets();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("assets" as any) as any).delete().eq("id", id);
    toast({ title: "Asset removed" });
    fetchAssets();
  };

  const filtered = assets.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedAssets = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "category": cmp = a.category.localeCompare(b.category); break;
      case "status": cmp = a.status.localeCompare(b.status); break;
      case "serial_number": cmp = (a.serial_number || "").localeCompare(b.serial_number || ""); break;
      case "assigned_name": cmp = (a.assigned_name || "").localeCompare(b.assigned_name || ""); break;
      case "purchase_date": cmp = (a.purchase_date || "").localeCompare(b.purchase_date || ""); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const statusColors: Record<string, string> = {
    available: "bg-emerald-500/10 text-emerald-600",
    assigned: "bg-primary/10 text-primary",
    maintenance: "bg-amber-500/10 text-amber-600",
    retired: "bg-muted text-muted-foreground",
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Asset Management</h2>
        {isAdmin && (
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Asset
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : sortedAssets.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No assets found</p>
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
              {sortedAssets.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell>
                    <InlineEditCell value={a.name} onSave={(val) => handleInlineUpdate(a.id, "name", val)} />
                  </TableCell>
                  <TableCell>
                    <InlineEditCell value={a.description || ""} onSave={(val) => handleInlineUpdate(a.id, "description", val)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <InlineEditCell value={a.serial_number || ""} onSave={(val) => handleInlineUpdate(a.id, "serial_number", val)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${statusColors[a.status] || ""}`}>
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{a.assigned_name || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {a.purchase_date ? format(new Date(a.purchase_date), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(a.id)}>
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
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
            <DialogDescription>Register a new company asset</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Asset name" value={name} onChange={e => setName(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
            <Input placeholder="Serial number (optional)" value={serial} onChange={e => setSerial(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger><SelectValue placeholder="Assign to (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {staffList.map(s => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            <Button onClick={handleCreate} disabled={submitting || !name.trim()} className="w-full">
              {submitting ? "Adding..." : "Add Asset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetsModule;
