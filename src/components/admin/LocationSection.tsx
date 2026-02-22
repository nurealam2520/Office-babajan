import { useEffect, useState, useCallback } from "react";
import { MapPin, Wifi, WifiOff, RefreshCw, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const LocationSection = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: locs }, { data: profs }, { data: t }] = await Promise.all([
      supabase.from("user_locations").select("*").order("updated_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, username, mobile_number"),
      supabase.from("tasks").select("id, title, assigned_to, status").neq("status", "completed"),
    ]);
    setLocations(locs || []);
    setProfiles(profs || []);
    setTasks(t || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime location updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const getProfileUsername = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? `@${p.username}` : "";
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "এইমাত্র";
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ঘণ্টা আগে`;
    return `${Math.floor(hrs / 24)} দিন আগে`;
  };

  const getProfileMobile = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.mobile_number : "";
  };

  const filtered = locations.filter(loc => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = getProfileName(loc.user_id).toLowerCase();
    const username = getProfileUsername(loc.user_id).toLowerCase();
    const mobile = getProfileMobile(loc.user_id);
    return name.includes(q) || username.includes(q) || mobile.includes(searchQuery);
  });

  // Users with active tasks
  const taskedUserIds = [...new Set(tasks.map(t => t.assigned_to))];
  const taskedProfiles = profiles.filter(p => taskedUserIds.includes(p.user_id));

  const onlineCount = locations.filter(l => l.is_online).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">লোকেশন ট্র্যাকিং</h2>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">{onlineCount}</span> অনলাইন, {locations.length - onlineCount} অফলাইন
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" /> রিফ্রেশ
        </Button>
      </div>

      <Input
        placeholder="নাম, ইউজারনেম বা নম্বর দিয়ে খুঁজুন..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {/* Tasked users list */}
      {taskedProfiles.length > 0 && !searchQuery && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> টাস্ক প্রাপ্ত ইউজার ({taskedProfiles.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {taskedProfiles.map(p => (
              <Badge key={p.user_id} variant="outline" className="text-xs cursor-pointer hover:bg-primary/10"
                onClick={() => setSearchQuery(p.full_name)}>
                {p.full_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* All users list when no search */}
      {!searchQuery && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">সকল ইউজার ({profiles.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map(p => (
              <Badge key={p.user_id} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                onClick={() => setSearchQuery(p.full_name)}>
                {p.full_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <MapPin className="h-12 w-12" />
            <p>কোন লোকেশন ডেটা নেই</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(loc => (
            <Card key={loc.id} className={loc.is_online ? "border-primary/30" : ""}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-full p-2 ${loc.is_online ? "bg-primary/10" : "bg-muted"}`}>
                  {loc.is_online ? (
                    <Wifi className="h-5 w-5 text-primary" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{getProfileName(loc.user_id)}</p>
                  <p className="text-xs text-muted-foreground">{getProfileUsername(loc.user_id)}</p>
                  {loc.latitude && loc.longitude && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {loc.is_online ? "অনলাইন" : `শেষ দেখা: ${timeAgo(loc.last_seen_at)}`}
                  </p>
                </div>
                <Badge variant={loc.is_online ? "default" : "secondary"} className="text-xs">
                  {loc.is_online ? "অনলাইন" : "অফলাইন"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSection;
