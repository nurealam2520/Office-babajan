import { useEffect, useState, useCallback } from "react";
import { CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  businessId: string | null;
}

const WEEKDAYS = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

const AttendanceCalendar = ({ userId, businessId }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [records, setRecords] = useState<Record<string, { status: string; checkIn: string; checkOut: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0 });

  const fetchMonthData = useCallback(async () => {
    setLoading(true);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("check_in", startDate)
      .lte("check_in", endDate)
      .order("check_in", { ascending: true });

    const map: Record<string, any> = {};
    let present = 0, late = 0;

    (data || []).forEach((r: any) => {
      const day = new Date(r.check_in).getDate().toString();
      const hour = new Date(r.check_in).getHours();
      const status = hour >= 10 ? "late" : "present"; // After 10am = late
      map[day] = { status, checkIn: r.check_in, checkOut: r.check_out };
      if (status === "late") late++;
      else present++;
    });

    setRecords(map);

    // Count working days up to today
    const today = new Date();
    const lastDay = today.getMonth() === month && today.getFullYear() === year ? today.getDate() : new Date(year, month + 1, 0).getDate();
    let workDays = 0;
    for (let d = 1; d <= lastDay; d++) {
      const day = new Date(year, month, d).getDay();
      if (day !== 5) workDays++; // Friday off
    }
    const absent = Math.max(0, workDays - present - late);
    setSummary({ present, absent, late });
    setLoading(false);
  }, [userId, currentMonth]);

  useEffect(() => { fetchMonthData(); }, [fetchMonthData]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const getStatusColor = (day: number) => {
    const record = records[day.toString()];
    const today = new Date();
    const isToday = today.getDate() === day && today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear();
    const isFuture = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) > today;
    const isFriday = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay() === 5;

    if (isFuture) return "bg-background text-muted-foreground/40";
    if (isFriday) return "bg-muted/50 text-muted-foreground";
    if (!record) return isToday ? "bg-destructive/20 text-destructive ring-2 ring-destructive/30" : "bg-destructive/10 text-destructive/70";
    if (record.status === "late") return isToday ? "bg-amber-500/20 text-amber-700 ring-2 ring-amber-500/30" : "bg-amber-500/10 text-amber-700";
    return isToday ? "bg-primary/20 text-primary ring-2 ring-primary/30" : "bg-primary/10 text-primary";
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-4">
      {/* Month Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <span className="text-xl font-bold text-primary">{summary.present}</span>
            <p className="text-[10px] text-muted-foreground">উপস্থিত</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <span className="text-xl font-bold text-amber-600">{summary.late}</span>
            <p className="text-[10px] text-muted-foreground">বিলম্বে</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <span className="text-xl font-bold text-destructive">{summary.absent}</span>
            <p className="text-[10px] text-muted-foreground">অনুপস্থিত</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <Button variant="ghost" size="sm" onClick={prevMonth}>◀</Button>
          <CardTitle className="text-sm">
            {MONTHS_BN[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={nextMonth}>▶</Button>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              return (
                <div
                  key={day}
                  className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-colors ${getStatusColor(day)}`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary/30" /> উপস্থিত</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/30" /> বিলম্বে</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/30" /> অনুপস্থিত</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted" /> ছুটি</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceCalendar;
