import { useEffect, useState, useCallback } from "react";
import { Wallet, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  userId: string;
}

const CollectionSection = ({ userId }: Props) => {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", userId)
      .order("collection_date", { ascending: false });
    setCollections(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const addCollection = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const { error } = await supabase.from("collections").insert({
      user_id: userId,
      amount: parseFloat(amount),
      description: description || null,
      collection_date: collectionDate,
    });
    if (error) {
      toast({ title: t("error"), variant: "destructive" });
    } else {
      toast({ title: t("success"), description: t("collection.added") });
      setAmount("");
      setDescription("");
      setAddOpen(false);
      fetchCollections();
    }
  };

  const totalAmount = collections.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const todayTotal = collections
    .filter(c => c.collection_date === new Date().toISOString().split("T")[0])
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);

  const locale = language === "bn" ? "bn-BD" : "en-US";

  if (loading) return <div className="py-12 text-center text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> {t("collection.title")}
        </h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> {t("collection.new")}
          </Button>
          <Button size="sm" variant="outline" onClick={fetchCollections}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground">{t("collection.total")}</p>
            <p className="text-xl font-bold text-primary">৳{totalAmount.toLocaleString(locale)}</p>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground">{t("collection.today")}</p>
            <p className="text-xl font-bold text-accent-foreground">৳{todayTotal.toLocaleString(locale)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Collection List */}
      {collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Wallet className="h-12 w-12 opacity-30" />
            <p className="text-sm">{t("collection.no_collection")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {collections.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">৳{parseFloat(c.amount).toLocaleString(locale)}</p>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.collection_date).toLocaleDateString(locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Collection Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("collection.add_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">{t("collection.amount")}</p>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">{t("collection.date")}</p>
              <Input
                type="date"
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
              />
            </div>
            <Textarea
              placeholder={t("collection.description_placeholder")}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button onClick={addCollection} disabled={!amount || parseFloat(amount) <= 0}>
              {t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionSection;
