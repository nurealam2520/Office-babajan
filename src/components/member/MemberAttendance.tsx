import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut as LogOutIcon, Timer, MapPin, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Attendance {
  id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  device_info: string | null;
  ip_address: string | null;
}

interface Props {
  userId: string;
}

const MemberAttendance = ({ userId }: Props) => {
  const { toast } = useToast();
  const [todayRecord, setTodayRecord] = useState<Attendance | null>(null);
  const [recentRecords, setRecentRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  const fetchToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    const [{ data: todayData }, { data: recent }] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .gte("check_in", today)
        .order("check_in", { ascending: false })
        .limit(1),
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .order("check_in", { ascending: false })
        .limit(7),
    ]);
    setTodayRecord((todayData as any)?.[0] || null);
    setRecentRecords((recent as any) || []);
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

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/i.test(ua);
    const browser = /Chrome/i.test(ua) ? "Chrome" : /Firefox/i.test(ua) ? "Firefox" : /Safari/i.test(ua) ? "Safari" : "Other";
    return `${isMobile ? "Mobile" : "Desktop"} - ${browser}`;
  };

  const getLocation = (): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }
      setLocationStatus("requesting");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStatus("granted");
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setLocationStatus("denied");
          resolve({ lat: null, lng: null });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCheckIn = async () => {
    const [location] = await Promise.all([getLocation()]);
    const deviceInfo = getDeviceInfo();

    const { error } = await supabase.from("attendance").insert({
      user_id: userId,
      status: "present",
      latitude: location.lat,
      longitude: location.lng,
      device_info: deviceInfo,
    } as any);

    if (error) {
      toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
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
      toast({ title: "Checked out ✅" });
      fetchToday();
    }
  };

  if (loading) return <p className="text-center text-sm text-muted-foreground py-4">Loading...</p>;

  const checkedIn = todayRecord && !todayRecord.check_out;
  const checkedOut = todayRecord && todayRecord.check_out;

  return (
    <div className="space-y-4">
      {/* Today's Card */}
      <Card>
        <CardContent className="p-5 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Today's Attendance</span>
          </div>

          {!todayRecord && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">You haven't checked in today</p>
              <Button size="lg" className="w-full gap-2" onClick={handleCheckIn}>
                <LogIn className="h-5 w-5" /> Check In
              </Button>
              {locationStatus === "requesting" && (
                <p className="text-[11px] text-muted-foreground animate-pulse">📍 Requesting location...</p>
              )}
            </div>
          )}

          {checkedIn && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Check-in Time</p>
                <p className="text-sm font-medium">{new Date(todayRecord.check_in).toLocaleTimeString("en-US")}</p>
              </div>
              {todayRecord.latitude && (
                <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{todayRecord.latitude.toFixed(4)}, {todayRecord.longitude?.toFixed(4)}</span>
                </div>
              )}
              {todayRecord.device_info && (
                <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <Smartphone className="h-3 w-3" />
                  <span>{todayRecord.device_info}</span>
                </div>
              )}
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
                Total: {(() => {
                  const diff = new Date(todayRecord.check_out!).getTime() - new Date(todayRecord.check_in).getTime();
                  const h = Math.floor(diff / 3600000);
                  const m = Math.floor((diff % 3600000) / 60000);
                  return `${h}h ${m}m`;
                })()}
              </p>
              <Badge variant="secondary" className="text-xs">Today's shift completed ✅</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent History */}
      {recentRecords.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">Recent Attendance</h3>
            <div className="space-y-2">
              {recentRecords.slice(1).map((rec) => {
                const date = new Date(rec.check_in);
                const checkIn = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                const checkOut = rec.check_out
                  ? new Date(rec.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                  : "—";
                const total = rec.check_out
                  ? (() => {
                      const d = new Date(rec.check_out).getTime() - date.getTime();
                      return `${Math.floor(d / 3600000)}h ${Math.floor((d % 3600000) / 60000)}m`;
                    })()
                  : "—";
                return (
                  <div key={rec.id} className="flex items-center justify-between text-xs border-b last:border-0 pb-1.5">
                    <span className="text-muted-foreground">{date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span>{checkIn} → {checkOut}</span>
                    <Badge variant="outline" className="text-[10px]">{total}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MemberAttendance;
