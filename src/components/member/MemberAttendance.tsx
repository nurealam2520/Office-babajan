import { useEffect, useState, useCallback } from "react";
import { CheckCircle, LogOut as LogOutIcon, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  businessId: string | null;
}

const MemberAttendance = ({ userId, businessId }: Props) => {
  const { toast } = useToast();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [weekRecords, setWeekRecords] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // Today's record
    const { data: todayData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", today)
      .order("check_in", { ascending: false })
      .limit(1);

    setTodayRecord(todayData?.[0] || null);

    // Last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    let weekQuery = supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", weekAgo)
      .order("check_in", { ascending: false });

    const { data: week } = await weekQuery;
    setWeekRecords(week || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckIn = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("attendance").insert({
      user_id: userId,
      business_id: businessId,
      status: "present",
      note: note || null,
    });
    if (error) {
      toast({ title: "চেক-ইন ব্যর্থ", variant: "destructive", description: error.message });
    } else {
      toast({ title: "✅ চেক-ইন সফল", description: "আজকের উপস্থিতি রেকর্ড হয়েছে" });
      setNote("");
      fetchData();
    }
    setSubmitting(false);
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("id", todayRecord.id);
    if (error) {
      toast({ title: "চেক-আউট ব্যর্থ", variant: "destructive" });
    } else {
      toast({ title: "👋 চেক-আউট সফল", description: "আজকের কাজ শেষ!" });
      fetchData();
    }
    setSubmitting(false);
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: string) => {
    return new Date(ts).toLocaleDateString("bn-BD", { weekday: "short", day: "numeric", month: "short" });
  };

  const getDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "চলমান";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hrs} ঘণ্টা ${mins} মিনিট`;
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      {/* Today's Status */}
      <Card className="border-primary/20">
        <CardContent className="py-5">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("bn-BD", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>

            {!todayRecord ? (
              <>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Clock className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">আজ এখনো চেক-ইন করেননি</p>
                <Textarea
                  placeholder="নোট (ঐচ্ছিক) — যেমন: আজকের প্ল্যান..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <Button
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="w-full gap-2"
                  size="lg"
                >
                  <CheckCircle className="h-5 w-5" />
                  {submitting ? "চেক-ইন হচ্ছে..." : "চেক-ইন করুন"}
                </Button>
              </>
            ) : !todayRecord.check_out ? (
              <>
                <div className="flex items-center justify-center gap-2 text-primary">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-primary">আপনি অফিসে আছেন</p>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>ইন: {formatTime(todayRecord.check_in)}</span>
                  <span>সময়কাল: {getDuration(todayRecord.check_in, null)}</span>
                </div>
                {todayRecord.note && <p className="text-xs text-muted-foreground">📝 {todayRecord.note}</p>}
                <Button
                  onClick={handleCheckOut}
                  disabled={submitting}
                  variant="destructive"
                  className="w-full gap-2"
                  size="lg"
                >
                  <LogOutIcon className="h-5 w-5" />
                  {submitting ? "চেক-আউট হচ্ছে..." : "চেক-আউট করুন"}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">আজকের কাজ সম্পন্ন!</p>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>ইন: {formatTime(todayRecord.check_in)}</span>
                  <span>আউট: {formatTime(todayRecord.check_out)}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  মোট: {getDuration(todayRecord.check_in, todayRecord.check_out)}
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly History */}
      <div>
        <h3 className="text-sm font-semibold mb-2">গত ৭ দিনের রেকর্ড</h3>
        {weekRecords.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">কোন রেকর্ড নেই</p>
        ) : (
          <div className="space-y-1.5">
            {weekRecords.map(r => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between py-2.5 px-3">
                  <div>
                    <p className="text-xs font-medium">{formatDate(r.check_in)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatTime(r.check_in)} — {formatTime(r.check_out)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={r.check_out ? "outline" : "default"} className="text-[10px]">
                      {r.check_out ? getDuration(r.check_in, r.check_out) : "চলমান"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberAttendance;
