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
  { value: "all", label: "All Labels" },
  { value: "live", label: "🟢 Live" },
  { value: "advance", label: "🔵 Advance" },
  { value: "waiting_for_goods", label: "🟠 Waiting for Goods" },
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
    <div className="space-y-1.5 sm:space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <span className="text-xs sm:text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] sm:h-6 sm:px-2 sm:text-xs gap-0.5 text-destructive" onClick={clearFilters}>
              <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Clear
            </Button>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] sm:text-xs h-5 sm:h-auto px-1.5 sm:px-2.5">{totalCount} tasks</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-1 sm:gap-2">
        {/* Search */}
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="absolute left-2 sm:left-3 top-1/2 h-3 w-3 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 sm:pl-10 h-7 sm:h-9 text-[11px] sm:text-sm"
          />
        </div>

        {/* Status filter */}
        {onStatusFilterChange && (
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-7 sm:h-9 text-[11px] sm:text-xs">
              <SelectValue placeholder="Label" />
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
            <SelectTrigger className="h-7 sm:h-9 text-[11px] sm:text-xs">
              <SelectValue placeholder="User" />
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
            placeholder="From"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            className="h-7 sm:h-9 text-[11px] sm:text-xs"
          />
        )}

        {/* Date to */}
        {onDateToChange && (
          <Input
            type="date"
            placeholder="To"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
            className="h-7 sm:h-9 text-[11px] sm:text-xs"
          />
        )}
      </div>
    </div>
  );
};

export default TaskFilters;
