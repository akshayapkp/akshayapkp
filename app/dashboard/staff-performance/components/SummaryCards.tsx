// components/SummaryCards.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import { PerformanceRecord } from "../types";

import DailyCard from "./DailyCard";
import MonthlyCard from "./MonthlyCard";
import YearlyCard from "./YearlyCard";

import {
  BillRecord,
  StaffRecord,
} from "./types";

import {
  getDate,
  getCredit,
  matchesStaff,
  createSummary,
  calculateMonthlySalary,
  calculateYearlySalary,
} from "./SummaryHelpers";

interface SummaryCardsProps {
  records: PerformanceRecord[];
  attendanceLogs: any[];
  selectedStaff: string;

  dailyDate: Date;
  setDailyDate: React.Dispatch<
    React.SetStateAction<Date>
  >;

  selectedMonth: number;
  selectedYear: number;
  setSelectedMonth: React.Dispatch<
    React.SetStateAction<number>
  >;
  setSelectedYear: React.Dispatch<
    React.SetStateAction<number>
  >;

  yearlyYear: number;
  setYearlyYear: React.Dispatch<
    React.SetStateAction<number>
  >;
}

export default function SummaryCards({
  records,
  selectedStaff,

  dailyDate,
  setDailyDate,

  selectedMonth,
  selectedYear,
  setSelectedMonth,
  setSelectedYear,

  yearlyYear,
  setYearlyYear,
}: SummaryCardsProps) {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const [billRecords, setBillRecords] =
    useState<BillRecord[]>([]);

  const [staffRecords, setStaffRecords] =
    useState<StaffRecord[]>([]);

 useEffect(() => {
  const loadStaffData = async () => {
    try {
      const bills = JSON.parse(
        localStorage.getItem("smart_akshaya_bills") || "[]"
      );

      setBillRecords(Array.isArray(bills) ? bills : []);

      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load staff from Supabase:", error);
        setStaffRecords([]);
        return;
      }

      const mappedStaff = (data ?? []).map((row: any) => ({
        ...row,
        id: String(row.id ?? ""),
        staffName: String(row.staffName ?? row.name ?? ""),
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        role: String(row.role ?? "Staff"),
        salary: Number(row.salary ?? 0),
        upiId: String(row.upiId ?? row.upi_id ?? "").trim(),
      }));

      setStaffRecords(mappedStaff as StaffRecord[]);
    } catch (error) {
      console.error("Failed to load staff data:", error);
      setStaffRecords([]);
    }
  };

  loadStaffData();
}, []);

  const dailyRecords = useMemo(
    () =>
      records.filter((record) => {
        const date = getDate(record);

        return (
          matchesStaff(
            selectedStaff,
            record.staffName
          ) &&
          date.getDate() ===
            dailyDate.getDate() &&
          date.getMonth() ===
            dailyDate.getMonth() &&
          date.getFullYear() ===
            dailyDate.getFullYear()
        );
      }),
    [records, selectedStaff, dailyDate]
  );

  const monthlyRecords = useMemo(
    () =>
      records.filter((record) => {
        const date = getDate(record);

        return (
          matchesStaff(
            selectedStaff,
            record.staffName
          ) &&
          date.getMonth() ===
            selectedMonth &&
          date.getFullYear() ===
            selectedYear
        );
      }),
    [
      records,
      selectedMonth,
      selectedYear,
      selectedStaff,
    ]
  );

  const yearlyRecords = useMemo(
    () =>
      records.filter((record) => {
        const date = getDate(record);

        return (
          matchesStaff(
            selectedStaff,
            record.staffName
          ) &&
          date.getFullYear() ===
            yearlyYear
        );
      }),
    [
      records,
      yearlyYear,
      selectedStaff,
    ]
  );

  const dailyBills = useMemo(
    () =>
      billRecords.filter((bill) => {
        const date = getDate(bill);

        return (
          matchesStaff(
            selectedStaff,
            bill.staffName ||
              bill.staff
          ) &&
          date.getDate() ===
            dailyDate.getDate() &&
          date.getMonth() ===
            dailyDate.getMonth() &&
          date.getFullYear() ===
            dailyDate.getFullYear()
        );
      }),
    [
      billRecords,
      dailyDate,
      selectedStaff,
    ]
  );

  const monthlyBills = useMemo(
    () =>
      billRecords.filter((bill) => {
        const date = getDate(bill);

        return (
          matchesStaff(
            selectedStaff,
            bill.staffName ||
              bill.staff
          ) &&
          date.getMonth() ===
            selectedMonth &&
          date.getFullYear() ===
            selectedYear
        );
      }),
    [
      billRecords,
      selectedMonth,
      selectedYear,
      selectedStaff,
    ]
  );

  const yearlyBills = useMemo(
    () =>
      billRecords.filter((bill) => {
        const date = getDate(bill);

        return (
          matchesStaff(
            selectedStaff,
            bill.staffName ||
              bill.staff
          ) &&
          date.getFullYear() ===
            yearlyYear
        );
      }),
    [
      billRecords,
      yearlyYear,
      selectedStaff,
    ]
  );
console.log({
  selectedStaff,
  dailyBills,
  monthlyBills,
  yearlyBills,
});
  const staff = useMemo(
    () =>
      staffRecords.find((row) =>
        matchesStaff(
          selectedStaff,
          row.staffName || row.name
        )
      ),
    [staffRecords, selectedStaff]
  );

  const basicSalary = Number(
    staff?.salary || 0
  );

  const daily = createSummary(
    dailyRecords,
    getCredit(dailyBills)
  );

  const monthly = createSummary(
    monthlyRecords,
    getCredit(monthlyBills)
  );

  const yearly = createSummary(
    yearlyRecords,
    getCredit(yearlyBills)
  );

  const {
    bonus: monthlyBonus,
    finalSalary: finalMonthlySalary,
  } = calculateMonthlySalary(
    monthly.serviceCharge,
    basicSalary
  );

  const {
    yearlySalary,
    yearlyBonus,
    finalSalary: finalYearlySalary,
  } = calculateYearlySalary(
    yearly.serviceCharge,
    basicSalary
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <DailyCard
        daily={daily}
        dailyDate={dailyDate}
        setDailyDate={setDailyDate}
      />

      <MonthlyCard
        monthly={monthly}
        monthNames={monthNames}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        setSelectedMonth={
          setSelectedMonth
        }
        setSelectedYear={
          setSelectedYear
        }
        basicSalary={basicSalary}
        monthlyBonus={monthlyBonus}
        finalMonthlySalary={
          finalMonthlySalary
        }
        upiId={String((staff as any)?.upiId ?? (staff as any)?.upi_id ?? "")}
      />

      <YearlyCard
        yearly={yearly}
        yearlyYear={yearlyYear}
        setYearlyYear={
          setYearlyYear
        }
        yearlySalary={yearlySalary}
        yearlyBonus={yearlyBonus}
        finalYearlySalary={
          finalYearlySalary
        }
      />
    </div>
  );
}