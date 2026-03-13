import { useState, useRef } from "react";
import { Ban, Trash2, ShieldOff, Eye, MessageSquareOff, Clock, ArrowUpDown, ArrowUp, ArrowDown, GripVertical, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string;
  mobile_number: string;
  employee_id: string | null;
  is_active: boolean;
}

interface Restriction {
  id: string;
  user_id: string;
  restriction_type: string;
  reason: string | null;
  expires_at: string | null;
}

type SortKey = "full_name" | "username" | "mobile_number" | "employee_id" | "role" | "status";
type SortDir = "asc" | "desc";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  co_worker: "Co-Worker",
  co_worker_data_entry: "Co-Worker + DE",
  member: "Member",
  staff: "Staff",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600",
  admin: "bg-purple-500/10 text-purple-600",
  manager: "bg-blue-500/10 text-blue-600",
  co_worker: "bg-emerald-500/10 text-emerald-600",
  co_worker_data_entry: "bg-teal-500/10 text-teal-600",
};

const COLUMNS = [
  { key: "full_name", label: "Name", sortable: true, minWidth: 140 },
  { key: "username", label: "Username", sortable: true, minWidth: 100 },
  { key: "employee_id", label: "Emp ID", sortable: true, minWidth: 80 },
  { key: "role", label: "Role", sortable: true, minWidth: 100 },
  { key: "mobile_number", label: "Phone", sortable: true, minWidth: 120 },
  { key: "status", label: "Status", sortable: true, minWidth: 120 },
  { key: "actions", label: "Actions", sortable: false, minWidth: 180 },
];

interface Props {
  profiles: UserProfile[];
  restrictions: Restriction[];
  role: "super_admin" | "admin" | "manager";
  getUserRole: (uid: string) => string;
  isProtectedFromAction: (uid: string) => boolean;
  onBan: (user: UserProfile) => void;
  onRestrict: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
  onRemoveRestriction: (restrictionId: string) => void;
  onViewConversations: (user: UserProfile) => void;
  onChangeRole: (user: UserProfile) => void;
}

const ResizableHeader = ({ children, width, onResize }: { children: React.ReactNode; width: number; onResize: (delta: number) => void }) => {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = width;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX.current;
    onResize(delta);
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <TableHead style={{ width, minWidth: width, position: "relative" }} className="select-none">
      {children}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-primary/20 flex items-center justify-center"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
      </div>
    </TableHead>
  );
};

const UserManagementTable = ({
  profiles,
  restrictions,
  role,
  getUserRole,
  isProtectedFromAction,
  onBan,
  onRestrict,
  onDelete,
  onRemoveRestriction,
  onViewConversations,
  onChangeRole,
}: Props) => {
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.minWidth));

  const getRestriction = (uid: string) => restrictions.find(r => r.user_id === uid);

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return "Permanent";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const handleResize = (index: number, delta: number) => {
    setColWidths(prev => {
      const newWidths = [...prev];
      newWidths[index] = Math.max(COLUMNS[index].minWidth, prev[index] + delta);
      return newWidths;
    });
  };

  const sortedProfiles = [...profiles].sort((a, b) => {
    let cmp = 0;
    const rA = getRestriction(a.user_id);
    const rB = getRestriction(b.user_id);
    switch (sortKey) {
      case "full_name": cmp = a.full_name.localeCompare(b.full_name); break;
      case "username": cmp = a.username.localeCompare(b.username); break;
      case "mobile_number": cmp = a.mobile_number.localeCompare(b.mobile_number); break;
      case "employee_id": cmp = (a.employee_id || "").localeCompare(b.employee_id || ""); break;
      case "role": cmp = getUserRole(a.user_id).localeCompare(getUserRole(b.user_id)); break;
      case "status":
        const statusA = rA ? rA.restriction_type : "active";
        const statusB = rB ? rB.restriction_type : "active";
        cmp = statusA.localeCompare(statusB);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="border rounded-lg overflow-auto max-h-[70vh]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <TableRow>
            {COLUMNS.map((col, i) => (
              <ResizableHeader key={col.key} width={colWidths[i]} onResize={(d) => handleResize(i, d)}>
                <div
                  className={`flex items-center gap-1 text-xs font-semibold ${col.sortable ? "cursor-pointer hover:text-primary" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key as SortKey)}
                >
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </div>
              </ResizableHeader>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProfiles.map((user) => {
            const restriction = getRestriction(user.user_id);
            const userRole = getUserRole(user.user_id);
            return (
              <TableRow key={user.user_id} className={`hover:bg-muted/30 ${restriction ? "bg-destructive/5" : ""}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-[10px] font-semibold text-primary">{user.full_name.charAt(0)}</span>
                    </div>
                    <span className="text-xs font-medium">{user.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">@{user.username}</TableCell>
                <TableCell className="text-xs">{user.employee_id || "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-[9px] ${ROLE_COLORS[userRole] || ""}`}>
                    {ROLE_LABELS[userRole] || userRole}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{user.mobile_number}</TableCell>
                <TableCell>
                  {restriction ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="destructive" className="text-[9px]">
                        {restriction.restriction_type === "ban" ? "🚫 Banned" : "⚠️ Restricted"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {getTimeRemaining(restriction.expires_at)}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-600">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {(role === "super_admin" || role === "admin") && (
                      <>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Change Role" onClick={() => onChangeRole(user)}>
                          <UserCog className="h-3 w-3 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="View Messages" onClick={() => onViewConversations(user)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {!isProtectedFromAction(user.user_id) && (
                      <>
                        {restriction ? (
                          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onRemoveRestriction(restriction.id)}>
                            <ShieldOff className="h-2.5 w-2.5" /> Unban
                          </Button>
                        ) : (
                          <>
                            {(role === "super_admin" || role === "admin") && (
                              <>
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Ban" onClick={() => onBan(user)}>
                                  <Ban className="h-3 w-3 text-destructive" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Restrict" onClick={() => onRestrict(user)}>
                                  <MessageSquareOff className="h-3 w-3 text-amber-500" />
                                </Button>
                                {role === "super_admin" && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete" onClick={() => onDelete(user)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </>
                            )}
                            {role === "manager" && (
                              <Button variant="ghost" size="icon" className="h-6 w-6" title="Restrict" onClick={() => onRestrict(user)}>
                                <MessageSquareOff className="h-3 w-3 text-amber-500" />
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserManagementTable;
