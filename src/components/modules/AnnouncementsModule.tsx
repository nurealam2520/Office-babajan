import { useEffect, useState, useRef } from "react";
import { Megaphone, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "staff";
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_role: string | null;
  created_at: string;
  created_by: string;
  author_name?: string;
}

type SortKey = "title" | "priority" | "target_role" | "created_at" | "author_name";
type SortDir = "asc" | "desc";

const COLUMNS = [
  { key: "title", label: "Title", sortable: true, minWidth: 180 },
  { key: "content", label: "Content", sortable: false, minWidth: 200 },
  { key: "priority", label: "Priority", sortable: true, minWidth: 90 },
  { key: "target_role", label: "Target", sortable: true, minWidth: 90 },
  { key: "author_name", label: "Author", sortable: true, minWidth: 120 },
  { key: "created_at", label: "Posted", sortable: true, minWidth: 100 },
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
  multiline = false,
}: {
  value: string;
  onSave: (val: string) => void;
  multiline?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (editValue !== value) onSave(editValue);
  };

  if (editing) {
    if (multiline) {
      return (
        <Textarea
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          className="text-xs min-h-[60px]"
        />
      );
    }
    return (
      <Input
        ref={inputRef as any}
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
      className="cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded min-h-[24px] text-xs truncate"
      title="Double-click to edit"
    >
      {value || "—"}
    </div>
  );
};

const AnnouncementsModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [targetRole, setTargetRole] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.minWidth));
  const isAdmin = role === "super_admin" || role === "admin";

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    setAnnouncements(
      ((data as any[]) || []).map(a => ({
        ...a,
        author_name: profileMap.get(a.created_by) || "Admin",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

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
    const { error } = await (supabase.from("announcements" as any) as any).update({ [field]: value || null }).eq("id", id);
    if (error) toast({ title: "Update failed", variant: "destructive" });
    else { toast({ title: "Updated ✓" }); fetchData(); }
  };

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    const { error } = await (supabase.from("announcements" as any) as any).insert({
      title: title.trim(),
      content: content.trim(),
      priority,
      target_role: targetRole === "all" ? null : targetRole,
      created_by: userId,
    });
    if (error) {
      toast({ title: "Failed to create announcement", variant: "destructive" });
    } else {
      toast({ title: "Announcement posted!" });
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setPriority("normal");
      setTargetRole("all");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("announcements" as any) as any).delete().eq("id", id);
    toast({ title: "Announcement deleted" });
    fetchData();
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "title": cmp = a.title.localeCompare(b.title); break;
      case "priority": cmp = a.priority.localeCompare(b.priority); break;
      case "target_role": cmp = (a.target_role || "").localeCompare(b.target_role || ""); break;
      case "created_at": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      case "author_name": cmp = (a.author_name || "").localeCompare(b.author_name || ""); break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const priorityColor: Record<string, string> = {
    urgent: "bg-destructive/10 text-destructive border-destructive/30",
    important: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    normal: "bg-muted text-muted-foreground",
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Announcements</h2>
        {isAdmin && (
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : announcements.length === 0 ? (
        <div className="text-center py-8">
          <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No announcements</p>
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
              {sortedAnnouncements.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell>
                    <InlineEditCell value={a.title} onSave={(val) => handleInlineUpdate(a.id, "title", val)} />
                  </TableCell>
                  <TableCell>
                    <InlineEditCell value={a.content} onSave={(val) => handleInlineUpdate(a.id, "content", val)} multiline />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${priorityColor[a.priority] || ""}`}>
                      {a.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.target_role ? (
                      <Badge variant="secondary" className="text-[10px]">{a.target_role}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">All</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{a.author_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>Post a notice to users</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Content..." value={content} onChange={e => setContent(e.target.value)} rows={4} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="staff">Staff Only</SelectItem>
                  <SelectItem value="manager">Managers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={submitting || !title.trim() || !content.trim()} className="w-full">
              {submitting ? "Posting..." : "Post Announcement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsModule;
