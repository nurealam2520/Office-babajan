import { useEffect, useState } from "react";
import { FileText, Upload, Download, Trash2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "staff" | "co_worker" | "co_worker_data_entry";
}

interface Doc {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

const CATEGORIES = ["Policy", "Template", "Report", "Contract", "Other"];

const DocumentsModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const isAdmin = role === "super_admin" || role === "admin";

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("documents" as any)
      .select("*")
      .order("created_at", { ascending: false });

    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    setDocuments(
      ((data as any[]) || []).map(d => ({
        ...d,
        uploader_name: profileMap.get(d.uploaded_by) || "Unknown",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);

    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

    const { error } = await (supabase.from("documents" as any) as any).insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      file_url: urlData.publicUrl,
      file_name: file.name,
      uploaded_by: userId,
    });

    if (error) {
      toast({ title: "Failed to save document", variant: "destructive" });
    } else {
      toast({ title: "Document uploaded!" });
      setUploadOpen(false);
      setTitle("");
      setDescription("");
      setFile(null);
      fetchDocs();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    await (supabase.from("documents" as any) as any).delete().eq("id", id);
    toast({ title: "Document deleted" });
    fetchDocs();
  };

  const filtered = documents.filter(d => {
    if (catFilter !== "all" && d.category !== catFilter) return false;
    if (search) return d.title.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents</h2>
        {isAdmin && (
          <Button size="sm" className="gap-1" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No documents found</p>
        </div>
      ) : (
        filtered.map(doc => (
          <Card key={doc.id}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {doc.uploader_name} · {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge variant="outline" className="text-[10px]">{doc.category}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="Download">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Add a new document to the system</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Document title" value={title} onChange={e => setTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()} className="w-full">
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsModule;
