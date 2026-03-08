import { useEffect, useState } from "react";
import { Star, Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props {
  userId: string;
  role: "super_admin" | "admin" | "manager" | "staff";
}

interface Review {
  id: string;
  user_id: string;
  reviewer_id: string;
  rating: number;
  review_period: string;
  strengths: string | null;
  improvements: string | null;
  comments: string | null;
  created_at: string;
  user_name?: string;
  reviewer_name?: string;
}

const PerformanceModule = ({ userId, role }: Props) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [staffList, setStaffList] = useState<{ user_id: string; full_name: string }[]>([]);
  const [reviewUserId, setReviewUserId] = useState("");
  const [rating, setRating] = useState("3");
  const [period, setPeriod] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = role === "super_admin" || role === "admin" || role === "manager";

  const fetchReviews = async () => {
    setLoading(true);
    let query = supabase.from("performance_reviews" as any).select("*").order("created_at", { ascending: false }).limit(50);
    if (role === "staff") query = query.eq("user_id", userId);
    const { data } = await query;
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
    const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
    setStaffList(profiles || []);

    setReviews(((data as any[]) || []).map(r => ({
      ...r,
      user_name: profileMap.get(r.user_id) || "Unknown",
      reviewer_name: profileMap.get(r.reviewer_id) || "Unknown",
    })));
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleCreate = async () => {
    if (!reviewUserId || !period) return;
    setSubmitting(true);
    const { error } = await (supabase.from("performance_reviews" as any) as any).insert({
      user_id: reviewUserId,
      reviewer_id: userId,
      rating: parseInt(rating),
      review_period: period,
      strengths: strengths || null,
      improvements: improvements || null,
      comments: comments || null,
    });
    if (error) {
      toast({ title: "Failed to save review", variant: "destructive" });
    } else {
      toast({ title: "Review submitted!" });
      setCreateOpen(false);
      setReviewUserId("");
      setStrengths("");
      setImprovements("");
      setComments("");
      fetchReviews();
    }
    setSubmitting(false);
  };

  const ratingStars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
  const ratingColor = (n: number) => n >= 4 ? "text-emerald-500" : n >= 3 ? "text-amber-500" : "text-destructive";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance Reviews</h2>
        {isAdmin && (
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Review
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No reviews yet</p>
        </div>
      ) : (
        reviews.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{r.user_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Reviewed by {r.reviewer_name} · {r.review_period}
                  </p>
                </div>
                <span className={`font-mono text-sm ${ratingColor(r.rating)}`}>
                  {ratingStars(r.rating)}
                </span>
              </div>
              {r.strengths && (
                <div><span className="text-[10px] font-medium text-emerald-500">Strengths: </span><span className="text-xs text-muted-foreground">{r.strengths}</span></div>
              )}
              {r.improvements && (
                <div><span className="text-[10px] font-medium text-amber-500">Improvements: </span><span className="text-xs text-muted-foreground">{r.improvements}</span></div>
              )}
              {r.comments && <p className="text-xs text-muted-foreground">{r.comments}</p>}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Performance Review</DialogTitle>
            <DialogDescription>Evaluate a team member's performance</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reviewUserId} onValueChange={setReviewUserId}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>
                {staffList.filter(s => s.user_id !== userId).map(s => (
                  <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Review period (e.g. Q1 2026)" value={period} onChange={e => setPeriod(e.target.value)} />
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5,4,3,2,1].map(n => (
                  <SelectItem key={n} value={String(n)}>{ratingStars(n)} ({n}/5)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Strengths..." value={strengths} onChange={e => setStrengths(e.target.value)} rows={2} />
            <Textarea placeholder="Areas for improvement..." value={improvements} onChange={e => setImprovements(e.target.value)} rows={2} />
            <Textarea placeholder="Additional comments..." value={comments} onChange={e => setComments(e.target.value)} rows={2} />
            <Button onClick={handleCreate} disabled={submitting || !reviewUserId || !period} className="w-full">
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformanceModule;
