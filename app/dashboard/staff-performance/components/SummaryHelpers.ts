// components/SummaryHelpers.ts

import { BillRecord, Summary } from "./types";
import { PerformanceRecord } from "../types";
import { normalizeLocalDateKey } from "../utils";

export const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const getDate = (value: any): Date => {
  // Prefer a validated business-local bill date to avoid DD/MM/YYYY swaps
  // and JavaScript's silent rollover of impossible dates (for example, 31/02).
  const rawDate = String(value?.date ?? "").trim();
  if (rawDate) {
    const key = normalizeLocalDateKey(rawDate);
    if (!key) return new Date(0);
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const fallback = value?.timestamp ?? value?.created_at ?? value?.createdAt;
  const parsed = fallback ? new Date(fallback) : new Date(0);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export const matchesStaff = (
  selectedStaff: string,
  staffName?: string
) =>
  selectedStaff === "All" ||
  (staffName || "").trim().replace(/\s+/g, " ").toLowerCase() ===
    selectedStaff.trim().replace(/\s+/g, " ").toLowerCase();

export const getCredit = (rows: BillRecord[]) =>
  rows.reduce((sum, row: any) => {
    const amount =
      Number(row.credit) ||
      Number(row.owedAmount) ||
      Number(row.pendingAmount) ||
      Number(row.balance) ||
      0;

    return sum + amount;
  }, 0);

export const createSummary = (
  rows: PerformanceRecord[],
  credit: number
): Summary => {
  const deptFee = rows.reduce(
    (sum, row) =>
      sum + Number(row.departmentFee || 0),
    0
  );

  const serviceCharge = rows.reduce(
    (sum, row) =>
      sum + Number(row.serviceCharge || 0),
    0
  );

  const totalCash = rows.reduce(
    (sum, row) =>
      sum + Number(row.totalAmount || 0),
    0
  );

  return {
    // Rows represent bills; show the number of service items across those bills.
    services: rows.reduce(
      (sum, row: any) => sum + (Number(row.totalServices || 0) > 0 ? Number(row.totalServices) : 1),
      0
    ),
    deptFee,
    serviceCharge,
    credit,
    totalCash,
  };
};

export const calculateMonthlySalary = (
  serviceCharge: number,
  basicSalary: number
) => {
  const profit = Math.max(
    serviceCharge - basicSalary,
    0
  );

  const bonus = profit * 0.05;

  return {
    profit,
    bonus,
    finalSalary: basicSalary + bonus,
  };
};

export const calculateYearlySalary = (
  yearlyServiceCharge: number,
  basicSalary: number
) => {
  const yearlySalary = basicSalary * 12;

  const yearlyProfit = Math.max(
    yearlyServiceCharge - yearlySalary,
    0
  );

  const yearlyBonus = yearlyProfit * 0.05;

  return {
    yearlySalary,
    yearlyProfit,
    yearlyBonus,
    finalSalary:
      yearlySalary + yearlyBonus,
  };
};