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
    <div ref={ref} className="print-report hidden">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-report, .print-report * { visibility: visible !important; }
          .print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10mm;
            background: white !important;
            color: black !important;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-report .office-name {
            text-align: center;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: 1px;
            margin: 0 0 4px;
            color: #111;
          }
          .print-report .office-tagline {
            text-align: center;
            font-size: 11px;
            color: #6b7280;
            margin: 0 0 8px;
          }
          .print-report .report-header {
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 10px;
          }
          .print-report .report-header h1 {
            font-size: 16px;
            font-weight: 700;
            margin: 6px 0 0;
            color: #1f2937;
          }
          .print-report .report-header .meta {
            font-size: 10px;
            color: #6b7280;
            margin: 4px 0 0;
          }
          .print-report table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            page-break-inside: auto;
          }
          .print-report tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .print-report thead {
            display: table-header-group;
          }
          .print-report th, .print-report td {
            border: 1px solid #d1d5db;
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
            font-size: 9px;
          }
          .print-report th {
            background: #f3f4f6 !important;
            font-weight: 700;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #374151;
          }
          .print-report td { color: #1f2937; }
          .print-report .row-even { background: #f9fafb !important; }
          .print-report .report-footer {
            margin-top: 12px;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            border-top: 1px solid #d1d5db;
            padding-top: 6px;
            page-break-inside: avoid;
          }
          .print-report .summary-row {
            background: #e5e7eb !important;
            font-weight: 700;
          }
          .print-report .summary-row td {
            font-size: 10px;
            color: #111;
          }
          @page {
            margin: 10mm;
            size: landscape;
          }
        }
      `}</style>

      <div className="report-header">
        <p className="office-name">Office Management</p>
        <p className="office-tagline">Shahzada's Hub — Official Report</p>
        <h1>{title}</h1>
        <p className="meta">Generated: {now} &nbsp;•&nbsp; Total Tasks: {tasks.length}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: "30px" }}>#</th>
            <th style={{ width: "60px" }}>Task ID</th>
            <th style={{ minWidth: "140px" }}>Title</th>
            <th style={{ width: "100px" }}>Assigned To</th>
            <th style={{ width: "70px" }}>Status</th>
            <th style={{ width: "80px" }}>Label</th>
            <th style={{ width: "80px" }}>Due Date</th>
            <th style={{ width: "80px" }}>P. Date</th>
            <th style={{ width: "70px", textAlign: "right" }}>Budget</th>
            <th style={{ width: "70px" }}>Credit Line</th>
            <th style={{ width: "70px", textAlign: "right" }}>T. Security</th>
            <th style={{ minWidth: "100px" }}>Remark</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, idx) => (
            <tr key={task.id} className={idx % 2 === 0 ? "" : "row-even"}>
              <td>{idx + 1}</td>
              <td style={{ fontFamily: "monospace" }}>{task.task_number || "—"}</td>
              <td>
                <strong>{task.title}</strong>
                {task.description && <div style={{ fontSize: "8px", color: "#6b7280", marginTop: 1 }}>{task.description}</div>}
              </td>
              <td>{task.assignee_name || "—"}</td>
              <td>{statusLabels[task.status] || task.status}</td>
              <td>{task.label ? labelLabels[task.label] || task.label : "—"}</td>
              <td>{fmtDate(task.due_date)}</td>
              <td>{fmtDate(task.planned_date)}</td>
              <td style={{ textAlign: "right" }}>{fmtNum(task.budget)}</td>
              <td>{task.credit_line || "—"}</td>
              <td style={{ textAlign: "right" }}>{fmtNum(task.t_security)}</td>
              <td style={{ fontSize: "8px" }}>{task.admin_note || "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="summary-row">
            <td colSpan={8} style={{ textAlign: "right" }}>Total:</td>
            <td style={{ textAlign: "right" }}>{fmtNum(tasks.reduce((s, t) => s + (t.budget || 0), 0))}</td>
            <td>—</td>
            <td style={{ textAlign: "right" }}>{fmtNum(tasks.reduce((s, t) => s + (t.t_security || 0), 0))}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div className="report-footer">
        Office Management — Shahzada's Hub &nbsp;•&nbsp; Confidential &nbsp;•&nbsp; Page 1
      </div>
    </div>
  );
});

TaskReportPrintView.displayName = "TaskReportPrintView";

export default TaskReportPrintView;
