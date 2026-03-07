import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut as LogOutIcon, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attendance {
  id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  note: string | null;
}

interface Props {
  userId: string;
}

const MemberAttendance = ({ userId }: Props) => {
  const { toast } = useToast();
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState("");

  const fetchToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("check_in", today)
      .order("check_in", { ascending: false })
      .limit(1);
    setTodayRecord(data?.[0] || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchToday();
  }, [userId]);

  useEffect(() => {
    if (!todayRecord || todayRecord.check_out) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(todayRecord.check_in).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  const handleCheckIn = async () => {
    const { error } = await supabase.from("attendance").insert({
      user_id: userId,
      status: "present",
    });
    if (error) {
      toast({ title: "Check-in failed", variant: "destructive" });
    } else {
      toast({ title: "Checked in ✅" });
      fetchToday();
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    const { error } = await supabase
      .from("attendance")
      .update({ check_out: new Date().toISOString() })
      .eq("id", todayRecord.id);
    if (error) {
      toast({ title: "Check-out failed", variant: "destructive" });
    } else {
      toast({ title: "Checked out" });
      fetchToday();
    }
  };

  if (loading) return <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>;

  const checkedIn = todayRecord && !todayRecord.check_out;
  const checkedOut = todayRecord && todayRecord.check_out;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Today's Attendance</span>
          </div>

          {!todayRecord && (
            <Button size="lg" className="w-full gap-2" onClick={handleCheckIn}>
              <LogIn className="h-5 w-5" /> Check In
            </Button>
          )}

          {checkedIn && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Check-in Time</p>
                <p className="text-sm font-medium">{new Date(todayRecord.check_in).toLocaleTimeString("en-US")}</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Timer className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-2xl font-bold font-mono text-primary">{elapsed}</span>
              </div>
              <Button size="lg" variant="destructive" className="w-full gap-2" onClick={handleCheckOut}>
                <LogOutIcon className="h-5 w-5" /> Check Out
              </Button>
            </>
          )}

          {checkedOut && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="text-sm font-medium">{new Date(todayRecord.check_in).toLocaleTimeString("en-US")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="text-sm font-medium">{new Date(todayRecord.check_out!).toLocaleTimeString("en-US")}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Total Time: {(() => {
                  const diff = new Date(todayRecord.check_out!).getTime() - new Date(todayRecord.check_in).getTime();
                  const h = Math.floor(diff / 3600000);
                  const m = Math.floor((diff % 3600000) / 60000);
                  return `${h}h ${m}m`;
                })()}
              </p>
              <ShiftBadge />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ShiftBadge = () => (
  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground">
    Today's shift completed ✅
  </span>
);

export default MemberAttendance;
