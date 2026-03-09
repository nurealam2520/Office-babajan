import { forwardRef } from "react";
import type { Task } from "./TaskCard";

const labelLabels: Record<string, string> = {
  live: "Live",
  advance: "Advance",
  waiting_for_goods: "Waiting for the Goods",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  issues: "Issues",
  processing: "Processing",
  ready_to_bid: "Ready to Bid",
  bidded: "Bidded",
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const fmtNum = (n: number | null | undefined) => {
  if (n == null) return "—";
  return n.toLocaleString();
};

interface Props {
  tasks: Task[];
  title?: string;
}

const TaskReportPrintView = forwardRef<HTMLDivElement, Props>(({ tasks, title = "Task Report" }, ref) => {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div ref={ref} className="print-report hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible !important; }
          .print-report {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white;
            color: black;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11px;
          }
          .print-report table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          .print-report th, .print-report td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            text-align: left;
            vertical-align: top;
          }
          .print-report th {
            background: #f3f4f6;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
          }
          .print-report td { font-size: 11px; }
          .print-report .report-header {
            text-align: center;
            margin-bottom: 16px;
            border-bottom: 2px solid #111;
            padding-bottom: 12px;
          }
          .print-report .report-header h1 {
            font-size: 20px;
            font-weight: 700;
            margin: 0;
          }
          .print-report .report-header p {
            font-size: 11px;
            color: #6b7280;
            margin: 4px 0 0;
          }
          .print-report .report-footer {
            margin-top: 16px;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            border-top: 1px solid #d1d5db;
            padding-top: 8px;
          }
          .print-report .summary-row {
            background: #f9fafb;
            font-weight: 600;
          }
          @page { margin: 15mm; size: landscape; }
        }
      `}</style>

      <div className="report-header">
        <h1>{title}</h1>
        <p>Generated on {now} • Total Tasks: {tasks.length}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Task ID</th>
            <th>Title</th>
            <th>Assigned To</th>
            <th>Status</th>
            <th>Label</th>
            <th>Due Date</th>
            <th>P. Date</th>
            <th>Budget</th>
            <th>Credit Line</th>
            <th>T. Security</th>
            <th>Remark</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => (
            <tr key={task.id}>
              <td>{idx + 1}</td>
              <td>{task.task_number || "—"}</td>
              <td>
                <strong>{task.title}</strong>
                {task.description && <div style={{ fontSize: "10px", color: "#6b7280", marginTop: 2 }}>{task.description}</div>}
              </td>
              <td>{task.assignee_name || "—"}</td>
              <td>{statusLabels[task.status] || task.status}</td>
              <td>{task.label ? labelLabels[task.label] || task.label : "—"}</td>
              <td>{fmtDate(task.due_date)}</td>
              <td>{fmtDate(task.planned_date)}</td>
              <td style={{ textAlign: "right" }}>{fmtNum(task.budget)}</td>
              <td>{task.credit_line || "—"}</td>
              <td style={{ textAlign: "right" }}>{fmtNum(task.t_security)}</td>
              <td>{task.admin_note || "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="summary-row">
            <td colSpan={8}>Total</td>
            <td style={{ textAlign: "right" }}>{fmtNum(tasks.reduce((s, t) => s + (t.budget || 0), 0))}</td>
            <td>—</td>
            <td style={{ textAlign: "right" }}>{fmtNum(tasks.reduce((s, t) => s + (t.t_security || 0), 0))}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div className="report-footer">
        Shahzada's Hub — Confidential Report
      </div>
    </div>
  );
});

TaskReportPrintView.displayName = "TaskReportPrintView";

export default TaskReportPrintView;
