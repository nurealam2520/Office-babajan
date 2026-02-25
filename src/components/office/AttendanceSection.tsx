import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, LogOut, RefreshCw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager";
  businessId: string | null;
}

const AttendanceSection = ({ userId, role, businessId }: Props) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const nextDay = new Date(new Date(selectedDate).getTime() + 86400000).toISOString().split("T")[0];

    let query = supabase
      .from("attendance")
      .select("*")
      .gte("created_at", selectedDate)
      .lt("created_at", nextDay)
      .order("check_in", { ascending: false });

    if (businessId) query = query.eq("business_id", businessId);

    const [{ data: att }, { data: p }] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name, username"),
    ]);

    setRecords(att || []);
    setProfiles(p || []);
    setLoading(false);
  }, [businessId, selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  const getDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "চলমান";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs}ঘ ${mins}মি`;
  };

  const present = records.filter(r => r.status === "present").length;
  const stillIn = records.filter(r => !r.check_out).length;
  const checkedOut = records.filter(r => r.check_out).length;
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> অ্যাটেন্ডেন্স রিপোর্ট
        </h2>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-auto h-8 text-xs"
          />
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date label */}
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4" />
        {isToday ? "আজ" : new Date(selectedDate).toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long" })}
        {" — "}{present} জন উপস্থিত
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">উপস্থিত</p>
            <p className="text-2xl font-bold text-primary">{present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">{isToday ? "এখনো অফিসে" : "চেক-আউট ছাড়া"}</p>
            <p className="text-2xl font-bold text-foreground">{stillIn}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">চেক-আউট</p>
            <p className="text-2xl font-bold text-foreground">{checkedOut}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-12 w-12" />
            <p>{isToday ? "আজ কেউ চেক-ইন করেনি" : "এই তারিখে কোন রেকর্ড নেই"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{getProfileName(r.user_id)}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-primary" /> ইন: {formatTime(r.check_in)}
                    </span>
                    <span className="flex items-center gap-1">
                      <LogOut className="h-3 w-3 text-destructive" /> আউট: {formatTime(r.check_out)}
                    </span>
                    {r.check_out && (
                      <span className="text-[10px]">⏱ {getDuration(r.check_in, r.check_out)}</span>
                    )}
                  </div>
                  {r.note && <p className="text-xs text-muted-foreground mt-1">📝 {r.note}</p>}
                </div>
                <Badge variant={r.check_out ? "outline" : "default"} className="text-xs">
                  {r.check_out ? "সম্পন্ন" : "অফিসে আছে"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttendanceSection;
