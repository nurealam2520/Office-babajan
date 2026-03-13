import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Search, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin";
}

interface LogEntry {
  id: string;
  user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  log_type: string;
  created_at: string;
  user_name?: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: "Logged in",
  logout: "Logged out",
  role_change: "Changed role",
  task_create: "Created task",
  task_update: "Updated task",
  task_delete: "Deleted task",
  user_delete: "Deleted user",
  user_ban: "Banned user",
  user_restrict: "Restricted user",
  user_unban: "Unbanned user",
  attendance_checkin: "Checked in",
  attendance_checkout: "Checked out",
  message_delete: "Deleted message",
  otp_generate: "Generated OTP",
  payroll_create: "Created payroll",
  announcement_create: "Created announcement",
};

const ActivityLogsModule = ({ userId, role }: Props) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<"all" | "user" | "system">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [userList, setUserList] = useState<{ user_id: string; full_name: string }[]>([]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("activity_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (logType !== "all") {
      query = query.eq("log_type", logType);
    }
    if (userFilter !== "all") {
      query = query.eq("user_id", userFilter);
    }

    const [{ data: logsData }, { data: profilesData }] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name"),
    ]);

    const profileMap = new Map<string, string>();
    (profilesData || []).forEach(p => profileMap.set(p.user_id, p.full_name));
    setProfiles(profileMap);
    setUserList(profilesData || []);

    setLogs(((logsData as any[]) || []).map(l => ({
      ...l,
      user_name: profileMap.get(l.user_id) || "Unknown",
    })));
    setLoading(false);
  }, [logType, userFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.user_name?.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
    );
  });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Logs</h2>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tabs value={logType} onValueChange={(v) => setLogType(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-7 px-3">All</TabsTrigger>
            <TabsTrigger value="user" className="text-xs h-7 px-3">
              <User className="h-3 w-3 mr-1" /> User
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs h-7 px-3">
              <Settings className="h-3 w-3 mr-1" /> System
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {userList.map(u => (
              <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-9" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading logs...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">No activity logs found</div>
      ) : (
        <div className="space-y-2 max-h-[65vh] overflow-y-auto">
          {filtered.map(log => (
            <Card key={log.id}>
              <CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{log.user_name}</span>
                    <Badge variant={log.log_type === "system" ? "default" : "secondary"} className="text-[9px]">
                      {log.log_type === "system" ? "System" : "User"}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground mt-0.5">
                    {ACTION_LABELS[log.action] || log.action}
                    {log.details?.target_name && (
                      <span className="text-muted-foreground"> — {log.details.target_name}</span>
                    )}
                    {log.details?.new_role && (
                      <span className="text-primary"> → {log.details.new_role.replace(/_/g, " ")}</span>
                    )}
                  </p>
                  {log.details?.reason && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Reason: {log.details.reason}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(log.created_at)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLogsModule;
