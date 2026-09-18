"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  History,
  IndianRupee,
  BriefcaseBusiness,
  QrCode,
  ExternalLink,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { PerformanceRecord, SalaryHistory } from "../types";

interface SalarySectionProps {
  records: PerformanceRecord[];
  salaryHistory: SalaryHistory[];
  selectedStaff: string;
  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  onOpenHistory: () => void;
}

interface StaffPaymentInfo {
  name: string;
  salary: number;
  upiId: string;
}

export default function SalarySection({
  records,
  salaryHistory,
  selectedStaff,
  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,
  onOpenHistory,
}: SalarySectionProps) {
  const [staffPaymentInfo, setStaffPaymentInfo] =
    useState<StaffPaymentInfo | null>(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [showSalaryQr, setShowSalaryQr] = useState(false);
  const [billedServiceRows, setBilledServiceRows] = useState<any[]>([]);

  useEffect(() => {
    try {
      const serviceEntries = JSON.parse(localStorage.getItem("serviceEntries") || "[]");
      const billedServices = JSON.parse(localStorage.getItem("billedServicesData") || "[]");
      const source = [
        ...(Array.isArray(serviceEntries) ? serviceEntries : []),
        ...(Array.isArray(billedServices) ? billedServices : []),
      ];

      const seen = new Set<string>();
      const rows = source.filter((item: any, index: number) => {
        if (!item || typeof item !== "object") return false;
        const billId = String(item.billId || item.billID || item.invoiceId || "").trim();
        const service = String(item.serviceName || item.service || item.name || "").trim();
        const signature = billId
          ? `${billId}|${service}|${Number(item.qty ?? item.quantity ?? 1)}|${Number(item.totalAmount ?? item.total ?? 0)}`
          : `${item.id || index}|${service}|${Number(item.qty ?? item.quantity ?? 1)}|${Number(item.totalAmount ?? item.total ?? 0)}`;
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });

      setBilledServiceRows(rows);
    } catch {
      setBilledServiceRows([]);
    }
  }, [selectedStaff, selectedMonth, selectedYear]);

  const monthlyRecords = useMemo(
    () =>
      records.filter((record) => {
        const date = new Date(record.date || record.timestamp);
        const matchesStaff =
          selectedStaff === "All" ||
          record.staffName?.toLowerCase() === selectedStaff.toLowerCase();

        return (
          matchesStaff &&
          date.getMonth() === selectedMonth &&
          date.getFullYear() === selectedYear
        );
      }),
    [records, selectedStaff, selectedMonth, selectedYear]
  );

  const monthlyBilledRows = useMemo(() => {
    const monthRows: any[] = [];
    const seen = new Set<string>();

    billedServiceRows.forEach((item: any, index: number) => {
      const rawDate = item.dateTime || item.date || item.createdAt || item.timestamp;
      const date = new Date(rawDate);
      if (
        Number.isNaN(date.getTime()) ||
        date.getMonth() !== selectedMonth ||
        date.getFullYear() !== selectedYear
      ) return;

      const serviceName = String(item.serviceName || item.service || item.name || "").trim();
      if (!serviceName) return;

      const staffName = String(item.staffName || item.staff || "Admin User").trim();
      const billId = String(item.billId || item.billID || item.invoiceId || item.id || `row-${index}`).trim();

      // Use the exact same service-line identity as Staff Performance → Billed Services.
      const signature = [
        billId,
        serviceName.toLowerCase(),
        Number(item.qty ?? item.quantity ?? 1),
        Number(item.totalAmount ?? item.total ?? 0),
        staffName.toLowerCase(),
      ].join("|");

      if (seen.has(signature)) return;
      seen.add(signature);

      monthRows.push({
        ...item,
        quantity: Number(item.qty ?? item.quantity ?? 1) || 1,
        departmentFee: Number(item.walletChg ?? item.deptChg ?? item.deptFee ?? item.departmentFee ?? 0) || 0,
        serviceCharge: Number(item.srvChg ?? item.srvCharge ?? item.serviceCharge ?? 0) || 0,
        totalAmount: Number(item.totalAmount ?? item.total ?? 0) || 0,
        staffName,
      });
    });

    return monthRows;
  }, [billedServiceRows, selectedMonth, selectedYear]);

  const commissionByService = useMemo(() => {
    try {
      const managed = JSON.parse(localStorage.getItem("managedServices") || "[]");
      const map = new Map<string, number>();
      if (Array.isArray(managed)) {
        managed.forEach((service: any) => {
          const name = String(service?.name || "").trim().toLowerCase();
          if (name) map.set(name, Number(service?.commission ?? 0) || 0);
        });
      }
      return map;
    } catch {
      return new Map<string, number>();
    }
  }, [selectedMonth, selectedYear]);

  const useBilledData = monthlyBilledRows.length > 0;

  const totalCommission = useBilledData
    ? monthlyBilledRows.reduce((sum, row: any) => {
        const direct = Number(row.commission ?? row.commissionAmount ?? NaN);
        if (Number.isFinite(direct)) return sum + direct;

        const serviceName = String(row.serviceName || row.service || row.name || "").trim().toLowerCase();
        const commissionRate = commissionByService.get(serviceName) ?? 0;
        const qty = Number(row.qty ?? row.quantity ?? 1) || 1;
        return sum + commissionRate * qty;
      }, 0)
    : monthlyRecords.reduce((sum, record) => sum + Number(record.commission || 0), 0);

  const totalDepartmentFee = useBilledData
    ? monthlyBilledRows.reduce((sum, row: any) => sum + Number(row.departmentFee || 0), 0)
    : monthlyRecords.reduce((sum, record) => sum + Number(record.departmentFee || 0), 0);

  const totalServiceCharge = useBilledData
    ? monthlyBilledRows.reduce((sum, row: any) => sum + Number(row.serviceCharge || 0), 0)
    : monthlyRecords.reduce((sum, record) => sum + Number(record.serviceCharge || 0), 0);

  const latestSalary = salaryHistory.length > 0 ? salaryHistory[0] : null;

  useEffect(() => {
    let cancelled = false;

    const loadStaffPaymentInfo = async () => {
      if (!selectedStaff || selectedStaff === "All") {
        setStaffPaymentInfo(null);
        return;
      }

      setStaffLoading(true);

      const { data, error } = await supabase
        .from("staff")
        .select("name, salary, upi_id")
        .ilike("name", selectedStaff)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Failed to load staff payment details:", error);
        setStaffPaymentInfo(null);
      } else if (data) {
        setStaffPaymentInfo({
          name: String(data.name ?? selectedStaff),
          salary: Number(data.salary ?? 0),
          upiId: String(data.upi_id ?? "").trim(),
        });
      } else {
        setStaffPaymentInfo(null);
      }

      setStaffLoading(false);
    };

    loadStaffPaymentInfo();
    return () => {
      cancelled = true;
    };
  }, [selectedStaff]);

  const currentMonthPaidAmount =
    latestSalary &&
    latestSalary.paymentDate &&
    (() => {
      const paymentDate = new Date(latestSalary.paymentDate);
      return (
        paymentDate.getMonth() === selectedMonth &&
        paymentDate.getFullYear() === selectedYear
      );
    })()
      ? Number(latestSalary.amount || 0)
      : 0;

  const salaryAmount =
    currentMonthPaidAmount > 0
      ? currentMonthPaidAmount
      : Number(staffPaymentInfo?.salary || 0);

  const upiId = staffPaymentInfo?.upiId || "";

  const upiPaymentUrl = useMemo(() => {
    if (!upiId || salaryAmount <= 0 || selectedStaff === "All") return "";

    const params = new URLSearchParams({
      pa: upiId,
      pn: staffPaymentInfo?.name || selectedStaff,
      am: salaryAmount.toFixed(2),
      cu: "INR",
    });

    return `upi://pay?${params.toString()}`;
  }, [upiId, salaryAmount, selectedStaff, staffPaymentInfo?.name]);

  const qrImageUrl = useMemo(() => {
    if (!upiPaymentUrl) return "";

    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
      upiPaymentUrl
    )}`;
  }, [upiPaymentUrl]);

  // Match Billed Services exactly: one displayed service row = one item.
  const totalServices = useBilledData
    ? monthlyBilledRows.length
    : monthlyRecords.reduce((sum, record) => sum + Number(record.totalServices || 0), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-emerald-100 p-3">
            <Wallet size={24} className="text-emerald-700" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Salary Summary
            </h2>
            <p className="text-sm text-slate-500">
              Monthly salary & commission overview
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400"
            aria-label="Salary summary month"
          >
            {[
              "January","February","March","April","May","June",
              "July","August","September","October","November","December",
            ].map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400"
            aria-label="Salary summary year"
          >
            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
          onClick={onOpenHistory}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
        >
          <History size={18} />
          Salary History
        </button>
        </div>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Services
            </p>
            <BriefcaseBusiness size={18} className="text-slate-500" />
          </div>
          <h3 className="mt-4 text-3xl font-black text-slate-800">
            {totalServices}
          </h3>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Service Charge
            </p>
            <IndianRupee size={18} className="text-emerald-700" />
          </div>
          <h3 className="mt-4 text-3xl font-black text-emerald-700">
            ₹{totalServiceCharge.toFixed(2)}
          </h3>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Department Fee
            </p>
            <IndianRupee size={18} className="text-amber-700" />
          </div>
          <h3 className="mt-4 text-3xl font-black text-amber-700">
            ₹{totalDepartmentFee.toFixed(2)}
          </h3>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Total Commission
            </p>
            <IndianRupee size={18} className="text-indigo-700" />
          </div>
          <h3 className="mt-4 text-3xl font-black text-indigo-700">
            ₹{totalCommission.toFixed(2)}
          </h3>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Monthly Salary Payment
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {selectedStaff === "All"
                  ? "Select a staff member to generate their salary QR."
                  : `${selectedStaff} • ${new Date(
                      selectedYear,
                      selectedMonth
                    ).toLocaleString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}`}
              </p>

              <div className="mt-5 flex flex-wrap items-end gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Salary Amount
                  </p>
                  <p className="mt-1 text-3xl font-black text-emerald-600">
                    ₹{salaryAmount.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    UPI ID
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {staffLoading
                      ? "Loading..."
                      : upiId || "UPI ID not set"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSalaryQr(true)}
                disabled={!qrImageUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                title={
                  !upiId
                    ? "Add the staff member's UPI ID in Staff Management"
                    : salaryAmount <= 0
                      ? "Basic salary must be greater than ₹0"
                      : "Show salary payment QR"
                }
              >
                <QrCode size={18} />
                Pay Salary
              </button>

              {!qrImageUrl && (
                <p className="max-w-xs text-center text-[11px] text-slate-400">
                  {selectedStaff === "All"
                    ? "Select a specific staff member."
                    : !upiId
                      ? "Add UPI ID in Staff Management."
                      : "Basic salary must be greater than ₹0."}
                </p>
              )}
            </div>

            {showSalaryQr && qrImageUrl && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setShowSalaryQr(false);
                }}
              >
                <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-800">
                        Salary Payment QR
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {staffPaymentInfo?.name || selectedStaff}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSalaryQr(false)}
                      className="rounded-lg px-2 py-1 text-lg font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex flex-col items-center p-6">
                    <div className="rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
                      <img
                        src={qrImageUrl}
                        alt={`Salary payment QR for ${staffPaymentInfo?.name || selectedStaff}`}
                        width={260}
                        height={260}
                        className="h-[260px] w-[260px] rounded-xl"
                      />
                    </div>

                    <p className="mt-4 text-2xl font-black text-emerald-600">
                      ₹{salaryAmount.toFixed(2)}
                    </p>

                    <p className="mt-1 text-center text-xs text-slate-500">
                      Scan with Google Pay, PhonePe, Paytm or another UPI app.
                    </p>

                    <p className="mt-2 text-center text-xs font-semibold text-slate-600">
                      UPI: {upiId}
                    </p>

                    <a
                      href={upiPaymentUrl}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      Open UPI
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-lg font-bold text-slate-800">
            Latest Salary Payment
          </h3>

          {latestSalary ? (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Staff Name
                </p>
                <p className="mt-2 text-lg font-bold text-slate-800">
                  {latestSalary.staffName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Paid Amount
                </p>
                <p className="mt-2 text-2xl font-black text-emerald-600">
                  ₹{Number(latestSalary.amount || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment Date
                </p>
                <p className="mt-2 font-semibold text-slate-700">
                  {new Date(latestSalary.paymentDate).toLocaleDateString(
                    "en-GB"
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment Method
                </p>
                <p className="mt-2 font-semibold text-slate-700">
                  {latestSalary.paymentMethod}
                </p>
              </div>

              {latestSalary.notes && (
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </p>
                  <div className="mt-2 rounded-xl bg-white p-4 text-sm text-slate-700 shadow-sm">
                    {latestSalary.notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Wallet size={30} className="text-slate-400" />
              </div>
              <h4 className="text-lg font-bold text-slate-700">
                No Salary History
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                No salary payment history is available for the selected period.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
