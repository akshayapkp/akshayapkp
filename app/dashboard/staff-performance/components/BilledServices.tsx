"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, Search, ShieldAlert } from "lucide-react";
import { PerformanceRecord } from "../types";

interface BilledServicesProps {
  records: PerformanceRecord[];
  selectedStaff: string;
  searchQuery: string;
}

interface BilledRow {
  id: string;
  billId: string;
  dateTime: string;
  serviceName: string;
  wallet: string;
  quantity: number;
  departmentFee: number;
  serviceCharge: number;
  totalAmount: number;
  staffName: string;
  customerName: string;
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const localDateKey = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const indian = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (indian) return `${indian[3]}-${String(Number(indian[2])).padStart(2, "0")}-${String(Number(indian[1])).padStart(2, "0")}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const money = (value: number) => `₹${value.toFixed(2)}`;

export default function BilledServices({ records, selectedStaff, searchQuery }: BilledServicesProps) {
  const today = todayKey();
  const [rows, setRows] = useState<BilledRow[]>([]);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [appliedFromDate, setAppliedFromDate] = useState(today);
  const [appliedToDate, setAppliedToDate] = useState(today);
  const [serviceSearch, setServiceSearch] = useState("");
  const [dateError, setDateError] = useState("");

  useEffect(() => {
    try {
      const serviceEntries = JSON.parse(localStorage.getItem("serviceEntries") || "[]");
      const billedData = JSON.parse(localStorage.getItem("billedServicesData") || "[]");
      const savedBills = JSON.parse(localStorage.getItem("savedBillsList") || "[]");
      const source = [
        ...(Array.isArray(serviceEntries) ? serviceEntries : []),
        ...(Array.isArray(billedData) ? billedData : []),
      ];

      const savedMap = new Map<string, any>();
      (Array.isArray(savedBills) ? savedBills : []).forEach((bill: any) => {
        const id = String(bill?.billId || bill?.id || "").trim();
        if (id) savedMap.set(id, bill);
      });

      const seen = new Set<string>();
      const formatted: BilledRow[] = [];

      source.forEach((item: any, index: number) => {
        if (!item || typeof item !== "object") return;

        const billId = String(item.billId || item.billID || item.invoiceId || item.id || `row-${index}`).trim();
        const serviceName = String(item.serviceName || item.service || item.name || "").trim();
        const staffName = String(item.staffName || item.staff || "Admin User").trim();
        const saved = savedMap.get(billId);

        const status = String(saved?.status ?? item.status ?? "").toLowerCase();
        const pending = Number(saved?.balance ?? saved?.owedAmount ?? item.pendingAmount ?? item.balance ?? 0);
        const validBill = status === "completed" || status === "paid" || status === "credit" || status === "pending" || pending > 0;
        if (!validBill || !serviceName) return;

        const signature = [
          billId, serviceName.toLowerCase(),
          Number(item.qty ?? item.quantity ?? 1),
          Number(item.totalAmount ?? item.total ?? 0),
          staffName.toLowerCase(),
        ].join("|");
        if (seen.has(signature)) return;
        seen.add(signature);

        formatted.push({
          id: String(item.id || `${billId}-${index}`),
          billId,
          dateTime: String(saved?.dateTime || item.dateTime || item.timestamp || item.date || ""),
          serviceName,
          wallet: String(item.wallet || item.defaultWallet || item.walletName || "N/A"),
          quantity: Number(item.qty ?? item.quantity ?? 1) || 1,
          departmentFee: Number(item.walletChg ?? item.deptChg ?? item.deptFee ?? item.departmentFee ?? 0) || 0,
          serviceCharge: Number(item.srvChg ?? item.srvCharge ?? item.serviceCharge ?? 0) || 0,
          totalAmount: Number(item.totalAmount ?? item.total ?? 0) || 0,
          staffName,
          customerName: String(saved?.customerName || item.customerName || item.name || "Walk-in Customer"),
        });
      });

      // If no detailed service rows exist, retain the existing performance data as a fallback.
      if (!formatted.length) {
        records.forEach((record) => {
          formatted.push({
            id: record.id,
            billId: String((record as any).billId || record.id),
            dateTime: record.timestamp || record.date,
            serviceName: String((record as any).serviceName || "Service"),
            wallet: String((record as any).wallet || "N/A"),
            quantity: Number((record as any).quantity || 1),
            departmentFee: Number(record.departmentFee || 0),
            serviceCharge: Number(record.serviceCharge || 0),
            totalAmount: Number(record.totalAmount || 0),
            staffName: record.staffName || "Admin User",
            customerName: record.customerName || "Walk-in Customer",
          });
        });
      }

      setRows(formatted);
    } catch (error) {
      console.error("Failed to load Staff Performance billed services:", error);
      setRows([]);
    }
  }, [records]);

  const handleSearch = () => {
    setDateError("");
    if (fromDate && toDate && fromDate > toDate) {
      setDateError("From Date cannot be after To Date.");
      return;
    }
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const filteredRows = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    const parentQ = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const date = localDateKey(row.dateTime);
      const staffMatch = selectedStaff === "All" || row.staffName.toLowerCase() === selectedStaff.toLowerCase();
      const fromMatch = !appliedFromDate || date >= appliedFromDate;
      const toMatch = !appliedToDate || date <= appliedToDate;
      const searchMatch =
        !q ||
        row.serviceName.toLowerCase().includes(q) ||
        row.billId.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q);

      const parentMatch =
        !parentQ ||
        row.customerName.toLowerCase().includes(parentQ) ||
        row.staffName.toLowerCase().includes(parentQ);

      return staffMatch && fromMatch && toMatch && searchMatch && parentMatch;
    });
  }, [rows, selectedStaff, searchQuery, serviceSearch, appliedFromDate, appliedToDate]);

  const totalDepartmentFee = filteredRows.reduce((sum, row) => sum + row.departmentFee, 0);
  const totalServiceCharge = filteredRows.reduce((sum, row) => sum + row.serviceCharge, 0);
  const grandTotal = filteredRows.reduce((sum, row) => sum + row.totalAmount, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">From Date</label>
            <div className="relative">
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setDateError(""); }} className="h-10 min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              <Calendar size={15} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">To Date</label>
            <div className="relative">
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setDateError(""); }} className="h-10 min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
              <Calendar size={15} className="pointer-events-none absolute right-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="flex min-w-[230px] flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Search</label>
            <input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Search service / bill / customer" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
          </div>

          <button type="button" onClick={handleSearch} className="h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]">
            <Search size={16} /> Search
          </button>
        </div>
        {dateError && <p className="mt-2 text-xs font-semibold text-red-500">{dateError}</p>}
        <p className="mt-2 text-[11px] text-slate-400">Default view: Today. Change the dates only when you need older records.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Items</p>
          <p className="mt-1 text-xl font-black text-slate-800">{filteredRows.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Dept. Fee</p>
          <p className="mt-1 text-xl font-black text-slate-800">{money(totalDepartmentFee)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Charge</p>
          <p className="mt-1 text-xl font-black text-slate-800">{money(totalServiceCharge)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Grand Total</p>
          <p className="mt-1 text-xl font-black text-indigo-600">{money(grandTotal)}</p>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
          <ShieldAlert size={40} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No billed service records found for today.</p>
          <p className="mt-1 text-xs text-slate-400">Choose another date and press Search to view older records.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Dept. Fee</th>
                  <th className="px-4 py-3 text-right">Svc Charge</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, index) => (
                  <tr key={row.id + "-" + index} className="text-slate-700 transition hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-center text-xs text-slate-400">{index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-600">
                      {(() => {
                        const parsed = new Date(row.dateTime);
                        return Number.isNaN(parsed.getTime())
                          ? row.dateTime || "-"
                          : parsed.toLocaleDateString("en-GB");
                      })()}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{row.serviceName}</td>
                    <td className="px-4 py-3.5">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{row.wallet}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium">{row.quantity.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-amber-600">{money(row.departmentFee)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{money(row.serviceCharge)}</td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-900">{money(row.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                  <td colSpan={5} className="px-4 py-3.5 text-right text-xs uppercase text-slate-500">Total</td>
                  <td className="px-4 py-3.5 text-right text-amber-700">{money(totalDepartmentFee)}</td>
                  <td className="px-4 py-3.5 text-right text-emerald-700">{money(totalServiceCharge)}</td>
                  <td className="px-4 py-3.5 text-right text-base text-slate-900">{money(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
