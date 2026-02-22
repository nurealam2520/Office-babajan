import { useEffect, useState, useCallback } from "react";
import { Wallet, RefreshCw, CalendarDays, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const CollectionReportSection = () => {
  const { t, language } = useLanguage();
  const locale = language === "bn" ? "bn-BD" : "en-US";
  const [collections, setCollections] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from("collections").select("*").order("collection_date", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, username"),
    ]);
    setCollections(c || []);
    setProfiles(p || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProfileName = (uid: string) => {
    const p = profiles.find(pr => pr.user_id === uid);
    return p ? p.full_name : uid?.slice(0, 8) || t("unknown");
  };

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  const totalAll = collections.reduce((s, c) => s + parseFloat(c.amount), 0);
  const todayTotal = collections.filter(c => c.collection_date === today).reduce((s, c) => s + parseFloat(c.amount), 0);
  const monthTotal = collections.filter(c => c.collection_date?.startsWith(currentMonth)).reduce((s, c) => s + parseFloat(c.amount), 0);

  const dailyMap = new Map<string, number>();
  collections.forEach(c => { const d = c.collection_date; dailyMap.set(d, (dailyMap.get(d) || 0) + parseFloat(c.amount)); });
  const dailyBreakdown = Array.from(dailyMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30);

  const monthlyMap = new Map<string, number>();
  collections.forEach(c => { const m = c.collection_date?.slice(0, 7); if (m) monthlyMap.set(m, (monthlyMap.get(m) || 0) + parseFloat(c.amount)); });
  const monthlyBreakdown = Array.from(monthlyMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysStr = threeDaysAgo.toISOString().split("T")[0];
  const userTotals = new Map<string, number>();
  collections.filter(c => c.collection_date >= threeDaysStr).forEach(c => { userTotals.set(c.user_id, (userTotals.get(c.user_id) || 0) + parseFloat(c.amount)); });
  const top15 = Array.from(userTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);

  if (loading) return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> {t("collection_report.title")}
        </h2>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t("refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground">{t("collection_report.grand_total")}</p>
            <p className="text-xl font-bold text-primary">৳{totalAll.toLocaleString(locale)}</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground">{t("collection_report.today")}</p>
            <p className="text-xl font-bold text-accent-foreground">৳{todayTotal.toLocaleString(locale)}</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/50 border-secondary">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground">{t("collection_report.this_month")}</p>
            <p className="text-xl font-bold text-secondary-foreground">৳{monthTotal.toLocaleString(locale)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)}>
        <TabsList className="w-full">
          <TabsTrigger value="daily" className="flex-1 gap-1.5">
            <CalendarDays className="h-4 w-4" /> {t("collection_report.daily")}
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex-1 gap-1.5">
            <TrendingUp className="h-4 w-4" /> {t("collection_report.monthly")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("collection_report.date")}</TableHead>
                    <TableHead className="text-right">{t("collection_report.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyBreakdown.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">{t("no_data")}</TableCell></TableRow>
                  ) : dailyBreakdown.map(([date, amt]) => (
                    <TableRow key={date}>
                      <TableCell>{new Date(date).toLocaleDateString(locale)}</TableCell>
                      <TableCell className="text-right font-medium">৳{amt.toLocaleString(locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="monthly">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("collection_report.month")}</TableHead>
                    <TableHead className="text-right">{t("collection_report.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyBreakdown.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">{t("no_data")}</TableCell></TableRow>
                  ) : monthlyBreakdown.map(([month, amt]) => (
                    <TableRow key={month}>
                      <TableCell>{month}</TableCell>
                      <TableCell className="text-right font-medium">৳{amt.toLocaleString(locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("collection_report.top15_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t("collection_report.name")}</TableHead>
                <TableHead className="text-right">{t("collection_report.amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top15.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{t("no_data")}</TableCell></TableRow>
              ) : top15.map(([uid, amt], i) => (
                <TableRow key={uid}>
                  <TableCell className="font-medium">{(i + 1).toLocaleString(locale)}</TableCell>
                  <TableCell>{getProfileName(uid)}</TableCell>
                  <TableCell className="text-right font-medium">৳{amt.toLocaleString(locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionReportSection;
