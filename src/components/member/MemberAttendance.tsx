import { useEffect, useState, useCallback, useRef } from "react";
import { CheckCircle, LogOut as LogOutIcon, Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  businessId: string | null;
  autoCheckIn?: boolean;
  onCheckedIn?: () => void;
}

const OFFICE_HOURS = 8; // 8 hours standard office time

const MemberAttendance = ({ userId, businessId, autoCheckIn, onCheckedIn }: Props) => {
  const { toast } = useToast();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [weekRecords, setWeekRecords] = useState<any[]>([]);
  const [elapsed, setElapsed] = useState("");
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeActive, setOvertimeActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCheckInDone = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data: todayData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", today)
      .order("check_in", { ascending: false })
      .limit(1);

    setTodayRecord(todayData?.[0] || null);

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const { data: week } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", weekAgo)
      .order("check_in", { ascending: false });

    setWeekRecords(week || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto check-in from welcome overlay
  useEffect(() => {
    if (autoCheckIn && !autoCheckInDone.current && !loading && !todayRecord) {
      autoCheckInDone.current = true;
      handleCheckIn();
    }
  }, [autoCheckIn, loading, todayRecord]);

  // Live timer
  useEffect(() => {
    if (todayRecord && !todayRecord.check_out) {
      const update = () => {
        const diff = Date.now() - new Date(todayRecord.check_in).getTime();
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsed(`${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);

        if (hrs >= OFFICE_HOURS && !overtimeActive) {
          setIsOvertime(true);
        }
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      setElapsed("");
      setIsOvertime(false);
    }
  }, [todayRecord, overtimeActive]);

  // Auto-close when office hours done and not overtime
  useEffect(() => {
    if (isOvertime && !overtimeActive && todayRecord && !todayRecord.check_out) {
      handleAutoCheckOut();
    }
  }, [isOvertime, overtimeActive]);

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
      toast({ title: "✅ চেক-ইন সফল", description: "অফিস আওয়ার শুরু হয়েছে" });
      setNote("");
      onCheckedIn?.();
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
      toast({ title: "👋 চেক-আউট সফল", description: overtimeActive ? "ওভারটাইম শেষ!" : "আজকের কাজ শেষ!" });
      setOvertimeActive(false);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleAutoCheckOut = async () => {
    if (!todayRecord) return;
    const { error } = await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString(), note: (todayRecord.note || "") + " [অটো চেক-আউট]" })
      .eq("id", todayRecord.id);
    if (!error) {
      toast({ title: "⏰ অফিস আওয়ার শেষ!", description: "অটোমেটিক চেক-আউট হয়েছে। ওভারটাইমের জন্য বাটনে ক্লিক করুন।" });
      fetchData();
    }
  };

  const handleStartOvertime = async () => {
    setOvertimeActive(true);
    setIsOvertime(false);
    // Re-open attendance for overtime
    const { error } = await supabase.from("attendance").insert({
      user_id: userId,
      business_id: businessId,
      status: "present",
      note: "ওভারটাইম",
    });
    if (!error) {
      toast({ title: "🔥 ওভারটাইম শুরু!", description: "ওভারটাইম কাউন্ট চলছে" });
      fetchData();
    }
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString("bn-BD", { weekday: "short", day: "numeric", month: "short" });

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
                <Button onClick={handleCheckIn} disabled={submitting} className="w-full gap-2" size="lg">
                  <CheckCircle className="h-5 w-5" />
                  {submitting ? "চেক-ইন হচ্ছে..." : "চেক-ইন করুন"}
                </Button>
              </>
            ) : !todayRecord.check_out ? (
              <>
                {/* Live Timer */}
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Timer className="h-6 w-6 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-primary">
                  {todayRecord.note === "ওভারটাইম" ? "🔥 ওভারটাইম চলছে" : "অফিস আওয়ার চলছে"}
                </p>
                <p className="text-3xl font-mono font-bold text-primary tabular-nums">{elapsed}</p>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>ইন: {formatTime(todayRecord.check_in)}</span>
                  <span>স্ট্যান্ডার্ড: {OFFICE_HOURS} ঘণ্টা</span>
                </div>
                {todayRecord.note && <p className="text-xs text-muted-foreground">📝 {todayRecord.note}</p>}
                <Button onClick={handleCheckOut} disabled={submitting} variant="destructive" className="w-full gap-2" size="lg">
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

                {/* Overtime button */}
                {!overtimeActive && (
                  <Button onClick={handleStartOvertime} variant="secondary" className="w-full gap-2 mt-2" size="lg">
                    <Timer className="h-5 w-5" />
                    ওভারটাইম শুরু করুন
                  </Button>
                )}
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
                    {r.note && <p className="text-[10px] text-muted-foreground">📝 {r.note}</p>}
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
