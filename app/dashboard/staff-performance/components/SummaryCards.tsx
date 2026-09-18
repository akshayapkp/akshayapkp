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

  // Monthly Performance must use the same completed service-entry source
  // as Staff Performance → Billed Services / Salary Summary.
  const [monthlyBilledSummary, setMonthlyBilledSummary] = useState<{
    services: number;
    deptFee: number;
    serviceCharge: number;
    totalCash: number;
  } | null>(null);

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

  useEffect(() => {
    try {
      const serviceEntriesRaw = JSON.parse(
        localStorage.getItem("serviceEntries") || "[]"
      );
      const billedServicesRaw = JSON.parse(
        localStorage.getItem("billedServicesData") || "[]"
      );

      const serviceEntries = Array.isArray(serviceEntriesRaw)
        ? serviceEntriesRaw
        : [];
      const billedServices = Array.isArray(billedServicesRaw)
        ? billedServicesRaw
        : [];

      const source = [...serviceEntries, ...billedServices];
      const seen = new Set<string>();
      const expectedMonthKey =
        `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;

      const rows = source.filter((item: any, index: number) => {
        if (!item || typeof item !== "object") return false;

        const rawDate =
          item.dateTime ||
          item.timestamp ||
          item.date ||
          item.createdAt ||
          "";
        const raw = String(rawDate).trim();

        let dateKey = "";
        const iso = raw.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
        const indian = raw.match(
          /^(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{4})/
        );

        if (iso) {
          dateKey = `${iso[1]}-${iso[2]}-${iso[3]}`;
        } else if (indian) {
          dateKey =
            `${indian[3]}-${String(Number(indian[2])).padStart(2, "0")}-${String(Number(indian[1])).padStart(2, "0")}`;
        } else if (raw) {
          const parsed = new Date(raw);
          if (!Number.isNaN(parsed.getTime())) {
            dateKey =
              `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
          }
        }

        if (!dateKey || !dateKey.startsWith(expectedMonthKey)) return false;

        const serviceName = String(
          item.serviceName || item.service || item.name || ""
        ).trim();
        if (!serviceName) return false;

        const staffName = String(
          item.staffName || item.staff || "Admin User"
        ).trim();

        const staffMatches =
          selectedStaff === "All" ||
          staffName.toLowerCase() === selectedStaff.toLowerCase();
        if (!staffMatches) return false;

        const billId = String(
          item.billId ||
            item.billID ||
            item.invoiceId ||
            item.id ||
            `row-${index}`
        ).trim();

        const signature = [
          billId,
          serviceName.toLowerCase(),
          Number(item.qty ?? item.quantity ?? 1),
          Number(item.totalAmount ?? item.total ?? 0),
          staffName.toLowerCase(),
        ].join("|");

        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      });

      setMonthlyBilledSummary({
        services: rows.length,
        deptFee: rows.reduce(
          (sum: number, item: any) =>
            sum +
            (Number(
              item.walletChg ??
                item.deptChg ??
                item.deptFee ??
                item.departmentFee ??
                0
            ) || 0),
          0
        ),
        serviceCharge: rows.reduce(
          (sum: number, item: any) =>
            sum +
            (Number(
              item.srvChg ??
                item.srvCharge ??
                item.serviceCharge ??
                0
            ) || 0),
          0
        ),
        totalCash: rows.reduce(
          (sum: number, item: any) =>
            sum +
            (Number(item.totalAmount ?? item.total ?? 0) || 0),
          0
        ),
      });
    } catch (error) {
      console.error("Failed to build monthly billed summary:", error);
      setMonthlyBilledSummary(null);
    }
  }, [selectedStaff, selectedMonth, selectedYear]);

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

  const monthly = monthlyBilledSummary
    ? {
        services: monthlyBilledSummary.services,
        deptFee: monthlyBilledSummary.deptFee,
        serviceCharge: monthlyBilledSummary.serviceCharge,
        credit: getCredit(monthlyBills),
        totalCash: monthlyBilledSummary.totalCash,
      }
    : createSummary(
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