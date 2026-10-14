"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import type { PerformanceRecord, PendingBill, SalaryHistory } from "../types";

type Props = {
  records: PerformanceRecord[];
  pendingBills: PendingBill[];
  salaryHistory: SalaryHistory[];
  attendanceLogs: any[];
  month: number;
  year: number;
};

function dateKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4}-\d{2})/);
  if (iso) return iso[1];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function readLocalArray(key: string): any[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function filterMonth(items: any[], keys: string[], monthKey: string) {
  return items.filter((item) => keys.some((key) => dateKey(item?.[key]) === monthKey));
}

export default function MonthlyDriveExport({
  records,
  pendingBills,
  salaryHistory,
  attendanceLogs,
  month,
  year,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  async function exportAndUpload() {
    setBusy(true);
    setMessage("");
    try {
      const billed = filterMonth(
        [...readLocalArray("serviceEntries"), ...readLocalArray("billedServicesData")],
        ["date", "dateTime", "createdAt", "timestamp"],
        monthKey,
      );
      const transactions = filterMonth(
        [
          ...readLocalArray("walletTransactions"),
          ...readLocalArray("transactions"),
          ...readLocalArray("wallet_transactions"),
        ],
        ["date", "createdAt", "timestamp", "transactionDate"],
        monthKey,
      );
      const expenses = filterMonth(
        [...readLocalArray("expensesData"), ...readLocalArray("expenses")],
        ["date", "createdAt", "timestamp"],
        monthKey,
      );
      const bills = filterMonth(
        [...readLocalArray("smart_akshaya_bills"), ...readLocalArray("savedBillsList")],
        ["date", "createdAt", "timestamp", "billDate"],
        monthKey,
      );
      const salary = filterMonth(salaryHistory, ["paymentDate", "date"], monthKey);
      const attendance = filterMonth(attendanceLogs, ["date", "timestamp", "loginTime"], monthKey);
      const performance = filterMonth(records, ["date", "timestamp"], monthKey);
      const pending = filterMonth(pendingBills, ["date", "timestamp", "createdAt"], monthKey);

      const workbook = XLSX.utils.book_new();
      const addSheet = (name: string, rows: any[]) => {
        const safeRows = rows.length ? rows : [{ note: `No ${name} records found for ${monthKey}` }];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(safeRows), name.slice(0, 31));
      };

      addSheet("Staff Performance", performance);
      addSheet("Salary History", salary);
      addSheet("Attendance", attendance);
      addSheet("Billed Services", billed);
      addSheet("Transactions", transactions);
      addSheet("Expenses", expenses);
      addSheet("Bills", bills);
      addSheet("Pending Bills", pending);

      const workbookBytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new File(
        [workbookBytes],
        `Akshaya-PKP-Staff-Report-${monthKey}.xlsx`,
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      );
      const form = new FormData();
      form.append("file", file);
      form.append("month", monthKey);

      const response = await fetch("/api/google-drive/staff-report-upload", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 && result.authorizeUrl) {
          setMessage("Connect Google Drive, then try the export again.");
          window.location.href = result.authorizeUrl;
          return;
        }
        throw new Error(result.error || "Upload failed");
      }

      const localUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = localUrl;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(localUrl);
      setMessage(`Excel downloaded and uploaded to Drive: ${result.file?.name || file.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not export the monthly report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={exportAndUpload}
        disabled={busy}
        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Preparing Excel…" : "Export Monthly Excel → Google Drive"}
      </button>
      {message ? <p role="status" className="max-w-xl text-xs font-medium text-slate-600">{message}</p> : null}
    </div>
  );
}
