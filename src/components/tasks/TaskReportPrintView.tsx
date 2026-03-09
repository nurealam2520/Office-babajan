import { forwardRef } from "react";
import type { Task } from "./TaskCard";

const labelLabels: Record<string, string> = {
  live: "Live",
  advance: "Advance",
  waiting_for_goods: "Waiting for the Goods",
};

const statusLabels: Record<string, string> = {
  live: "Live",
  advance: "Advance",
  waiting_for_goods: "Waiting for the Goods",
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
            padding: 0;
            background: white !important;
            color: black !important;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-report table {
            width: 100%;
            border-collapse: collapse;
            page-break-inside: auto;
          }
          .print-report tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          /* thead repeats on every page */
          .print-report thead {
            display: table-header-group;
          }
          /* tfoot repeats on every page */
          .print-report tfoot {
            display: table-footer-group;
          }
          .print-report .header-row td {
            border: none;
            padding: 0;
            text-align: center;
          }
          .print-report .header-content {
            padding: 8px 0 6px;
            border-bottom: 2px solid #1f2937;
            margin-bottom: 4px;
          }
          .print-report .office-name {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #111;
            margin: 0;
          }
          .print-report .office-tagline {
            font-size: 10px;
            color: #6b7280;
            margin: 2px 0;
          }
          .print-report .report-title {
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
            margin: 4px 0 0;
          }
          .print-report .report-meta {
            font-size: 9px;
            color: #6b7280;
            margin: 2px 0 0;
          }
          .print-report .col-header-row th {
            background: #f3f4f6 !important;
            font-weight: 700;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #374151;
            border: 1px solid #d1d5db;
            padding: 5px 6px;
            text-align: left;
          }
          .print-report td.data-cell {
            border: 1px solid #d1d5db;
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
            font-size: 9px;
            color: #1f2937;
          }
          .print-report .row-even td.data-cell { background: #f9fafb !important; }
          .print-report .summary-row td {
            background: #e5e7eb !important;
            font-weight: 700;
            font-size: 10px;
            color: #111;
            border: 1px solid #d1d5db;
            padding: 5px 6px;
          }
          .print-report .footer-row td {
            border: none;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            padding: 6px 0 0;
            border-top: 1px solid #d1d5db;
          }
          @page {
            margin: 10mm;
            size: landscape;
          }
        }
      `}</style>

      <table>
        {/* This thead repeats on every printed page */}
        <thead>
          <tr className="header-row">
            <td colSpan={12}>
              <div className="header-content">
                <p className="office-name">Office Management</p>
                <p className="office-tagline">Shahzada's Hub — Official Report</p>
                <p className="report-title">{title}</p>
                <p className="report-meta">Generated: {now} &nbsp;•&nbsp; Total Tasks: {tasks.length}</p>
              </div>
            </td>
          </tr>
          <tr className="col-header-row">
            <th style={{ width: "30px" }}>#</th>
            <th style={{ width: "60px" }}>Task ID</th>
            <th style={{ minWidth: "130px" }}>Title</th>
            <th style={{ width: "95px" }}>Assigned To</th>
            <th style={{ width: "65px" }}>Status</th>
            <th style={{ width: "75px" }}>Label</th>
            <th style={{ width: "75px" }}>Due Date</th>
            <th style={{ width: "75px" }}>P. Date</th>
            <th style={{ width: "65px", textAlign: "right" }}>Budget</th>
            <th style={{ width: "65px" }}>Credit Line</th>
            <th style={{ width: "65px", textAlign: "right" }}>T. Security</th>
            <th style={{ minWidth: "90px" }}>Remark</th>
          </tr>
        </thead>

        {/* This tfoot repeats on every printed page bottom */}
        <tfoot>
          <tr className="footer-row">
            <td colSpan={12}>
              Office Management — Shahzada's Hub &nbsp;•&nbsp; Confidential
            </td>
          </tr>
        </tfoot>

        <tbody>
          {tasks.map((task, idx) => (
            <tr key={task.id} className={idx % 2 !== 0 ? "row-even" : ""}>
              <td className="data-cell">{idx + 1}</td>
              <td className="data-cell" style={{ fontFamily: "monospace" }}>{task.task_number || "—"}</td>
              <td className="data-cell">
                <strong>{task.title}</strong>
                {task.description && <div style={{ fontSize: "8px", color: "#6b7280", marginTop: 1 }}>{task.description}</div>}
              </td>
              <td className="data-cell">{task.assignee_name || "—"}</td>
              <td className="data-cell">{statusLabels[task.status] || task.status}</td>
              <td className="data-cell">{task.label ? labelLabels[task.label] || task.label : "—"}</td>
              <td className="data-cell">{fmtDate(task.due_date)}</td>
              <td className="data-cell">{fmtDate(task.planned_date)}</td>
              <td className="data-cell" style={{ textAlign: "right" }}>{fmtNum(task.budget)}</td>
              <td className="data-cell">{task.credit_line || "—"}</td>
              <td className="data-cell" style={{ textAlign: "right" }}>{fmtNum(task.t_security)}</td>
              <td className="data-cell" style={{ fontSize: "8px" }}>{task.admin_note || "—"}</td>
            </tr>
          ))}
          <tr className="summary-row">
            <td colSpan={8} style={{ textAlign: "right" }}>Total:</td>
            <td style={{ textAlign: "right" }}>{fmtNum(tasks.reduce((s, t) => s + (t.budget || 0), 0))}</td>
            <td>—</td>
            <td style={{ textAlign: "right" }}>{fmtNum(tasks.reduce((s, t) => s + (t.t_security || 0), 0))}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});

TaskReportPrintView.displayName = "TaskReportPrintView";

export default TaskReportPrintView;
