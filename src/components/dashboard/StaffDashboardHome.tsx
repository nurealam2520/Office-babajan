import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { startOfDay } from "date-fns";

interface Props {
  userId: string;
  onNavigate?: (tab: string) => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210 80% 55%)",
  "hsl(45 93% 47%)",
];

const StaffDashboardHome = ({ userId }: Props) => {
  const [stats, setStats] = useState({
    total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, checkedIn: false,
  });
  const [taskDist, setTaskDist] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: tasks }, { data: att }] = await Promise.all([
        supabase.from("tasks").select("status, due_date").eq("assigned_to", userId),
        supabase.from("attendance").select("id, check_out")
          .eq("user_id", userId)
          .gte("check_in", startOfDay(new Date()).toISOString()),
      ]);

      const all = tasks || [];
      const now = new Date();
      const pending = all.filter(t => t.status === "pending").length;
      const inProgress = all.filter(t => t.status === "in_progress").length;
      const completed = all.filter(t => t.status === "completed").length;
      const overdue = all.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "completed").length;
      const checkedIn = att?.some(a => !a.check_out) || false;

      setStats({ total: all.length, pending, inProgress, completed, overdue, checkedIn });
      setTaskDist([
        { name: "Pending", value: pending },
        { name: "In Progress", value: inProgress },
        { name: "Completed", value: completed },
        { name: "Overdue", value: overdue },
      ].filter(d => d.value > 0));
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) return <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>;

  const cards = [
    { label: "My Tasks", value: stats.total, icon: ClipboardList, color: "text-primary" },
    { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-blue-500" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-500" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Overview</h2>
        <div className="flex items-center gap-1.5">
          <CalendarCheck className={`h-4 w-4 ${stats.checkedIn ? "text-green-500" : "text-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{stats.checkedIn ? "Checked In" : "Not Checked In"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold">{c.value}</p>
                </div>
                <c.icon className={`h-7 w-7 ${c.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {taskDist.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">My Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={taskDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                  {taskDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffDashboardHome;
