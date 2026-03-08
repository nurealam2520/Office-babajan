import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Users, CalendarCheck, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "staff";
  onNavigate?: (tab: string) => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210 80% 55%)",
  "hsl(45 93% 47%)",
  "hsl(150 60% 40%)",
];

const AdminDashboardHome = ({ userId, role, onNavigate }: Props) => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalUsers: 0,
    activeUsers: 0,
    todayAttendance: 0,
    pendingLeaves: 0,
  });
  const [taskDistribution, setTaskDistribution] = useState<{ name: string; value: number }[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<{ date: string; count: number }[]>([]);
  const [labelData, setLabelData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const LABEL_COLORS: Record<string, string> = {
    "Live": "hsl(150 60% 40%)",
    "Advance": "hsl(210 80% 55%)",
    "Waiting for Goods": "hsl(30 90% 50%)",
    "No Label": "hsl(var(--muted-foreground))",
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const [
        { data: tasks },
        { data: profiles },
        { data: todayAtt },
        { data: pendingLeaves },
      ] = await Promise.all([
        supabase.from("tasks").select("status, due_date"),
        supabase.from("profiles").select("is_active"),
        supabase.from("attendance").select("id")
          .gte("check_in", startOfDay(new Date()).toISOString()),
        supabase.from("leave_requests" as any).select("id").eq("status", "pending"),
      ]);

      const allTasks = tasks || [];
      const now = new Date();
      const pending = allTasks.filter(t => t.status === "pending").length;
      const inProgress = allTasks.filter(t => t.status === "in_progress").length;
      const completed = allTasks.filter(t => t.status === "completed").length;
      const overdue = allTasks.filter(t =>
        t.due_date && new Date(t.due_date) < now && t.status !== "completed"
      ).length;

      const allProfiles = profiles || [];

      setStats({
        totalTasks: allTasks.length,
        pendingTasks: pending,
        inProgressTasks: inProgress,
        completedTasks: completed,
        overdueTasks: overdue,
        totalUsers: allProfiles.length,
        activeUsers: allProfiles.filter(p => p.is_active).length,
        todayAttendance: todayAtt?.length || 0,
        pendingLeaves: (pendingLeaves as any[])?.length || 0,
      });

      // Task status distribution for pie chart
      setTaskDistribution([
        { name: "Pending", value: pending },
        { name: "In Progress", value: inProgress },
        { name: "Completed", value: completed },
        { name: "Overdue", value: overdue },
      ].filter(d => d.value > 0));

      // Label distribution
      const labelCount: Record<string, number> = { "Live": 0, "Advance": 0, "Waiting for Goods": 0, "No Label": 0 };
      allTasks.forEach(t => {
        const l = (t as any).label;
        if (l === "live") labelCount["Live"]++;
        else if (l === "advance") labelCount["Advance"]++;
        else if (l === "waiting_for_goods") labelCount["Waiting for Goods"]++;
        else labelCount["No Label"]++;
      });
      setLabelData(labelCount);

      // Attendance trend (last 7 days)
      const days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const trendData: { date: string; count: number }[] = [];
      for (const day of days) {
        const dayStart = startOfDay(day).toISOString();
        const dayEnd = startOfDay(subDays(day, -1)).toISOString();
        const { data: dayAtt } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .gte("check_in", dayStart)
          .lt("check_in", dayEnd);

        trendData.push({
          date: format(day, "EEE"),
          count: (dayAtt as any) || 0,
        });
      }

      // Re-fetch with count
      const trendDataFixed: { date: string; count: number }[] = [];
      for (const day of days) {
        const dayStart = startOfDay(day).toISOString();
        const dayEnd = startOfDay(subDays(day, -1)).toISOString();
        const { count } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .gte("check_in", dayStart)
          .lt("check_in", dayEnd);

        trendDataFixed.push({
          date: format(day, "EEE"),
          count: count || 0,
        });
      }
      setAttendanceTrend(trendDataFixed);
      setLoading(false);
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-8">Loading dashboard...</p>;
  }

  const statCards = [
    { label: "Total Tasks", value: stats.totalTasks, icon: ClipboardList, color: "text-primary", tab: "tasks" },
    { label: "In Progress", value: stats.inProgressTasks, icon: Clock, color: "text-blue-500", tab: "tasks" },
    { label: "Completed", value: stats.completedTasks, icon: CheckCircle2, color: "text-green-500", tab: "tasks" },
    { label: "Overdue", value: stats.overdueTasks, icon: AlertTriangle, color: "text-destructive", tab: "tasks" },
    { label: "Active Users", value: stats.activeUsers, icon: Users, color: "text-primary", tab: "users" },
    { label: "Today Attendance", value: stats.todayAttendance, icon: CalendarCheck, color: "text-green-500", tab: "attendance" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: TrendingUp, color: "text-yellow-500", tab: "shifts" },
    { label: "Total Users", value: stats.totalUsers, icon: BarChart3, color: "text-muted-foreground", tab: "users" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Dashboard Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(card => (
          <Card
            key={card.label}
            className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onNavigate?.(card.tab)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <card.icon className={`h-8 w-8 ${card.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {taskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={taskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {taskDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No tasks yet</p>
            )}
          </CardContent>
        </Card>

        {/* Attendance Trend Line */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Attendance Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by Label */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tasks by Label</CardTitle>
          </CardHeader>
          <CardContent>
            {taskDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={Object.entries(labelData).map(([name, value]) => ({ name, value }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.keys(labelData).map((key, i) => (
                      <Cell key={key} fill={LABEL_COLORS[key] || COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No task data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
