import { useEffect, useState, useCallback } from "react";
import { Users, CheckCircle, LogOut, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [todayRecord, setTodayRecord] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("attendance")
      .select("*")
      .gte("created_at", today)
      .order("check_in", { ascending: false });

    if (businessId) query = query.eq("business_id", businessId);

    const [{ data: att }, { data: p }] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name, username"),
    ]);

    setRecords(att || []);
    setProfiles(p || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> আজকের অ্যাটেন্ডেন্স
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">মোট উপস্থিত</p>
            <p className="text-2xl font-bold text-primary">{records.filter(r => r.status === "present").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">চেক-ইন করেছে</p>
            <p className="text-2xl font-bold text-foreground">{records.filter(r => !r.check_out).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 text-center">
            <p className="text-xs text-muted-foreground">চেক-আউট</p>
            <p className="text-2xl font-bold text-foreground">{records.filter(r => r.check_out).length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-12 w-12" />
            <p>আজ কেউ চেক-ইন করেনি</p>
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
                      <CheckCircle className="h-3 w-3 text-green-500" /> ইন: {formatTime(r.check_in)}
                    </span>
                    <span className="flex items-center gap-1">
                      <LogOut className="h-3 w-3 text-red-500" /> আউট: {formatTime(r.check_out)}
                    </span>
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
