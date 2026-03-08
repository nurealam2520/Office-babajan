import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  admin_note: string | null;
  label: string | null;
  created_at: string;
}

interface Props {
  tasks: Task[];
  onSelect: (taskId: string) => void;
}

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: "Pending", class: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", class: "bg-primary/10 text-primary" },
  completed: { label: "Completed", class: "bg-emerald-500/10 text-emerald-600" },
};

const labelColors: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  advance: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  waiting_for_goods: "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

const labelLabels: Record<string, string> = {
  live: "Live",
  advance: "Advance",
  waiting_for_goods: "Waiting for the Goods",
};

const fmtDate = (d: string | null) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const MemberTaskTableView = ({ tasks, onSelect }: Props) => {
  return (
    <ScrollArea className="w-full">
      <div className="min-w-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-bold min-w-[200px]">Title</TableHead>
              <TableHead className="text-xs font-bold w-[100px]">Status</TableHead>
              <TableHead className="text-xs font-bold w-[90px]">Label</TableHead>
              <TableHead className="text-xs font-bold w-[110px]">Due Date</TableHead>
              <TableHead className="text-xs font-bold w-[110px]">Created</TableHead>
              <TableHead className="text-xs font-bold min-w-[150px]">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "completed";
              const s = statusMap[task.status] || { label: task.status, class: "" };
              return (
                <TableRow
                  key={task.id}
                  className={`cursor-pointer hover:bg-accent/50 ${isOverdue ? "bg-destructive/5" : ""}`}
                  onClick={() => onSelect(task.id)}
                >
                  <TableCell className="py-2">
                    <p className="text-xs font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{task.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={`text-[10px] ${s.class}`} variant="outline">{s.label}</Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {task.label ? (
                      <Badge className={`text-[10px] ${labelColors[task.label] || ""}`} variant="outline">
                        {labelLabels[task.label] || task.label}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell className={`text-xs py-2 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                    {fmtDate(task.due_date)}
                    {isOverdue && " ⚠"}
                  </TableCell>
                  <TableCell className="text-xs py-2">{fmtDate(task.created_at)}</TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground">{task.admin_note || ""}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
};

export default MemberTaskTableView;
