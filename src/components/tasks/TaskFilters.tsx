import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  totalCount: number;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
  userFilter?: string;
  onUserFilterChange?: (v: string) => void;
  dateFrom?: string;
  onDateFromChange?: (v: string) => void;
  dateTo?: string;
  onDateToChange?: (v: string) => void;
  staffList?: { user_id: string; full_name: string }[];
}

const STATUSES = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "issues", label: "Issues" },
  { value: "processing", label: "Processing" },
  { value: "ready_to_bid", label: "Ready to Bid" },
  { value: "bidded", label: "Bidded" },
];

const TaskFilters = ({
  search, onSearchChange, totalCount,
  statusFilter = "all", onStatusFilterChange,
  userFilter = "all", onUserFilterChange,
  dateFrom = "", onDateFromChange,
  dateTo = "", onDateToChange,
  staffList = [],
}: Props) => {
  const hasActiveFilters = statusFilter !== "all" || userFilter !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    onStatusFilterChange?.("all");
    onUserFilterChange?.("all");
    onDateFromChange?.("");
    onDateToChange?.("");
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-destructive" onClick={clearFilters}>
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
        <Badge variant="outline">{totalCount} tasks</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Status filter */}
        {onStatusFilterChange && (
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* User filter */}
        {onUserFilterChange && staffList.length > 0 && (
          <Select value={userFilter} onValueChange={onUserFilterChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {staffList.map(s => (
                <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date from */}
        {onDateFromChange && (
          <Input
            type="date"
            placeholder="From date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            className="h-9 text-xs"
          />
        )}

        {/* Date to */}
        {onDateToChange && (
          <Input
            type="date"
            placeholder="To date"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
            className="h-9 text-xs"
          />
        )}
      </div>
    </div>
  );
};

export default TaskFilters;
