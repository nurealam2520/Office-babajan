import { useEffect, useState } from "react";
import { Package, Plus, Search, Trash2 } from "lucide-react";
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

const ASSET_CATEGORIES = ["Laptop", "Phone", "Furniture", "Vehicle", "Equipment", "Other"];
const ASSET_STATUSES = ["available", "assigned", "maintenance", "retired"];

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

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const { error } = await (supabase.from("assets" as any) as any).insert({
      name: name.trim(),
      description: description || null,
      category,
      status,
      assigned_to: assignTo || null,
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

  const statusColors: Record<string, string> = {
    available: "bg-emerald-500/10 text-emerald-600",
    assigned: "bg-primary/10 text-primary",
    maintenance: "bg-amber-500/10 text-amber-600",
    retired: "bg-muted text-muted-foreground",
  };

  const filtered = assets.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.serial_number?.toLowerCase().includes(search.toLowerCase())
  );

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
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No assets found</p>
        </div>
      ) : (
        filtered.map(a => (
          <Card key={a.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{a.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.category}{a.serial_number && ` · SN: ${a.serial_number}`}
                  {a.assigned_name && ` · Assigned to: ${a.assigned_name}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className={`text-[10px] ${statusColors[a.status] || ""}`}>
                  {a.status}
                </Badge>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
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
