import { useEffect, useState } from "react";
import { Search, Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  role: string;
  onSelect: (teamChatId: string, teamName: string) => void;
}

interface TeamChat {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

const TeamChatList = ({ userId, role, onSelect }: Props) => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<TeamChat[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [allUsers, setAllUsers] = useState<{ user_id: string; full_name: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const isAdmin = role === "super_admin" || role === "admin";

  const fetchTeams = async () => {
    setLoading(true);
    const { data: memberships } = await supabase
      .from("team_chat_members")
      .select("team_chat_id")
      .eq("user_id", userId);

    if (!memberships || memberships.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const ids = memberships.map(m => m.team_chat_id);
    const { data: chats } = await supabase
      .from("team_chats")
      .select("id, name, description")
      .in("id", ids)
      .eq("is_active", true);

    const items: TeamChat[] = [];
    for (const chat of chats || []) {
      const { count } = await supabase
        .from("team_chat_members")
        .select("id", { count: "exact", head: true })
        .eq("team_chat_id", chat.id);
      items.push({ ...chat, memberCount: count || 0 });
    }
    setTeams(items);
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, [userId]);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, full_name").eq("is_active", true);
    setAllUsers(data || []);
  };

  const createTeamChat = async () => {
    if (!name.trim()) return;
    const { data: chat, error } = await supabase
      .from("team_chats")
      .insert({ name: name.trim(), description: desc.trim() || null, created_by: userId })
      .select()
      .single();

    if (error || !chat) {
      toast({ title: "Error creating team chat", variant: "destructive" });
      return;
    }

    // Add creator + selected users
    const members = [userId, ...selectedUsers].map(uid => ({
      team_chat_id: chat.id,
      user_id: uid,
      role: uid === userId ? "admin" : "member",
    }));

    await supabase.from("team_chat_members").insert(members);
    toast({ title: "Team chat created!" });
    setCreateOpen(false);
    setName("");
    setDesc("");
    setSelectedUsers([]);
    fetchTeams();
  };

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search teams..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (o) loadUsers(); }}>
            <DialogTrigger asChild>
              <Button size="icon"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Team Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Team name" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional" rows={2} />
                </div>
                <div>
                  <Label>Members</Label>
                  <div className="max-h-40 overflow-y-auto space-y-1 mt-1 border rounded-md p-2">
                    {allUsers
                      .filter(u => u.user_id !== userId)
                      .map(u => (
                        <label key={u.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedUsers.includes(u.user_id)}
                            onCheckedChange={(checked) => {
                              setSelectedUsers(prev =>
                                checked ? [...prev, u.user_id] : prev.filter(id => id !== u.user_id)
                              );
                            }}
                          />
                          {u.full_name}
                        </label>
                      ))}
                  </div>
                </div>
                <Button onClick={createTeamChat} disabled={!name.trim()} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No team chats</p>
        </div>
      ) : (
        filtered.map(t => (
          <Card
            key={t.id}
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => onSelect(t.id, t.name)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t.name}</p>
                {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
              </div>
              <Badge variant="secondary" className="text-[10px]">{t.memberCount} members</Badge>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default TeamChatList;
