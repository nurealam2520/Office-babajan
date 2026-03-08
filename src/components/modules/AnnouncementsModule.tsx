import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

  const priorityColor: Record<string, string> = {
    urgent: "text-destructive border-destructive/30",
    important: "text-amber-500 border-amber-500/30",
    normal: "text-muted-foreground",
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
        announcements.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{a.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {a.author_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${priorityColor[a.priority] || ""}`}>
                    {a.priority}
                  </Badge>
                  {a.target_role && (
                    <Badge variant="secondary" className="text-[10px]">{a.target_role}</Badge>
                  )}
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.content}</p>
            </CardContent>
          </Card>
        ))
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
