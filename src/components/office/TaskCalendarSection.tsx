import { useEffect, useState, useCallback } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string;
  businessId: string | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "অপেক্ষমাণ", variant: "secondary" },
  in_progress: { label: "চলছে", variant: "default" },
  completed: { label: "সম্পন্ন", variant: "outline" },
  resubmit: { label: "পুনরায় জমা", variant: "destructive" },
};

const TaskCalendarSection = ({ userId, businessId }: Props) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("tasks").select("*").not("due_date", "is", null).order("due_date", { ascending: true });
    if (businessId) query = query.eq("business_id", businessId);

    const [{ data: t }, { data: p }] = await Promise.all([
      query,
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    setTasks(t || []);
    setProfiles(p || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfileName = (uid: string) => {
    const p = profiles.find(p => p.user_id === uid);
    return p ? p.full_name : uid.slice(0, 8);
  };

  // Tasks on selected date
  const selectedDateStr = selectedDate?.toISOString().split("T")[0];
  const tasksOnDate = tasks.filter(t => t.due_date && t.due_date.split("T")[0] === selectedDateStr);

  // Dates with tasks for highlighting
  const taskDates = tasks.map(t => new Date(t.due_date).toISOString().split("T")[0]);
  const modifiers = {
    hasTask: (date: Date) => taskDates.includes(date.toISOString().split("T")[0]),
  };
  const modifiersStyles = {
    hasTask: { backgroundColor: "hsl(var(--primary) / 0.15)", borderRadius: "50%" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> টাস্ক ক্যালেন্ডার
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-3 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {selectedDate ? new Date(selectedDate).toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" }) : "তারিখ সিলেক্ট করুন"}
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">লোড হচ্ছে...</p>
          ) : tasksOnDate.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                এই তারিখে কোন টাস্ক নেই
              </CardContent>
            </Card>
          ) : (
            tasksOnDate.map(task => (
              <Card key={task.id}>
                <CardContent className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{task.title}</p>
                    <Badge variant={statusMap[task.status]?.variant || "secondary"} className="text-[10px]">
                      {statusMap[task.status]?.label || task.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">👤 {getProfileName(task.assigned_to)}</p>
                  {task.description && <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCalendarSection;
