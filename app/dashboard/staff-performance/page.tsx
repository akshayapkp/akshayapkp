"use client";

import { useEffect, useMemo, useState } from "react";

import SummaryCards from "./components/SummaryCards";
import PendingBills from "./components/PendingBills";
import BilledServices from "./components/BilledServices";
import AttendanceCalendar from "./components/AttendanceCalendar";
import AttendanceModal from "./components/AttendanceModal";
import SalarySection from "./components/SalarySection";
import SalaryHistoryModal from "./components/SalaryHistoryModal";

import {
  PerformanceRecord,
  PendingBill,
  Holiday,
  SalaryHistory,
} from "./types";

import {
  loadPerformanceRecords,
  loadPendingBills,
  loadHolidays,
  loadSalaryHistory,
  getAttendanceRecord,
  getHoliday,
} from "./utils";

export default function StaffPerformancePage() {
  const [records, setRecords] =
    useState<PerformanceRecord[]>([]);

  const [pendingBills, setPendingBills] =
    useState<PendingBill[]>([]);

  const [holidays, setHolidays] =
    useState<Holiday[]>([]);

  const [salaryHistory, setSalaryHistory] =
    useState<SalaryHistory[]>([]);

  /* ---------------- LOGIN ATTENDANCE LOGS ---------------- */

  const [attendanceLogs, setAttendanceLogs] =
    useState<any[]>([]);

  /* ---------------- CURRENT USER ---------------- */

  const [currentUser, setCurrentUser] =
    useState<any>(null);

  /* ---------------- STAFF LIST ---------------- */

  const [staffList, setStaffList] = useState<string[]>([
    "All",
  ]);

  const [selectedStaff, setSelectedStaff] =
    useState("All");

  /* ---------------- SEARCH ---------------- */

  const [searchQuery, setSearchQuery] =
    useState("");

  /* ---------------- ATTENDANCE ---------------- */

  const [selectedDate, setSelectedDate] =
    useState<Date | null>(null);

  const [selectedRecord, setSelectedRecord] =
    useState<PerformanceRecord | null>(null);

  const [selectedHoliday, setSelectedHoliday] =
    useState<Holiday | null>(null);

  const [attendanceModalOpen, setAttendanceModalOpen] =
    useState(false);

  /* ---------------- SALARY ---------------- */

  const [salaryHistoryOpen, setSalaryHistoryOpen] =
    useState(false);

  /* ---------------- CALENDAR ---------------- */

  const [currentMonth, setCurrentMonth] =
    useState(new Date());

  const [summaryDate, setSummaryDate] =
    useState(new Date());

  const [summaryMonth, setSummaryMonth] =
    useState(new Date().getMonth());

  const [summaryYear, setSummaryYear] =
    useState(new Date().getFullYear());

  /* ---------------- TAB ---------------- */

  const [activeTab, setActiveTab] = useState<
    "pending" | "billed" | "attendance" | "salary"
  >("pending");

  /* ---------------- INITIAL LOAD ---------------- */

  useEffect(() => {
    setRecords(loadPerformanceRecords());

    setPendingBills(loadPendingBills());

    setHolidays(loadHolidays());

    setSalaryHistory(loadSalaryHistory());

    // Dashboard login attendance is stored separately from performance records.
    // Load it here so the Attendance tab counts the actual Present marks.
    try {
      const savedAttendance = localStorage.getItem(
        "staff_attendance_logs"
      );
      const parsedAttendance = savedAttendance
        ? JSON.parse(savedAttendance)
        : [];

      setAttendanceLogs(
        Array.isArray(parsedAttendance)
          ? parsedAttendance
          : []
      );
    } catch (error) {
      console.error(
        "Error loading staff attendance logs:",
        error
      );
      setAttendanceLogs([]);
    }

    if (typeof window === "undefined") return;

    const storedUser =
      localStorage.getItem("loggedInUser");

    const parsedUser = storedUser
      ? JSON.parse(storedUser)
      : {
          username: "Admin User",
          role: "admin",
        };

    setCurrentUser(parsedUser);

    if (
      parsedUser.role?.toLowerCase() !== "admin"
    ) {
      setSelectedStaff(parsedUser.username);

      setStaffList([
        parsedUser.username,
      ]);
    } else {
      loadStaffMembers();
    }
  }, []);
    /* ---------------- LOAD STAFF MEMBERS ---------------- */

  const loadStaffMembers = () => {
    if (typeof window === "undefined") return;

    const loadedNames: string[] = [];

    const possibleKeys = [
      "staff_members",
      "users",
      "akshaya_staffs",
      "smart_akshaya_staff",
    ];

    for (const key of possibleKeys) {
      const data = localStorage.getItem(key);

      if (!data) continue;

      try {
        const parsed = JSON.parse(data);

        if (!Array.isArray(parsed)) continue;

        const names = parsed
          .map(
            (staff: any) =>
              staff.name ||
              staff.staffName ||
              staff.username
          )
          .filter(Boolean);

        loadedNames.push(...names);
      } catch (error) {
        console.error(
          "Error loading staff:",
          key,
          error
        );
      }
    }

    /* fallback from performance records */

    records.forEach((record) => {
      if (record.staffName) {
        loadedNames.push(record.staffName);
      }
    });

    const uniqueStaff = Array.from(
      new Set(loadedNames)
    ).sort();

    if (uniqueStaff.length > 0) {
      setStaffList([
        "All",
        ...uniqueStaff,
      ]);
    } else {
      setStaffList([
        "All",
        "FASNIL",
        "SAHAL",
        "SHEEJA",
        "SUMAYYA",
      ]);
    }
  };

  /* ---------------- FILTERED RECORDS ---------------- */

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const staffMatch =
        selectedStaff === "All" ||
        record.staffName?.toLowerCase() ===
          selectedStaff.toLowerCase();

      const searchMatch =
        searchQuery.trim() === "" ||
        record.customerName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        record.staffName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      return staffMatch && searchMatch;
    });
  }, [
    records,
    selectedStaff,
    searchQuery,
  ]);

  const filteredPendingBills =
    useMemo(() => {
      return pendingBills.filter((bill) => {
        const staffMatch =
          selectedStaff === "All" ||
          bill.staffName?.toLowerCase() ===
            selectedStaff.toLowerCase();

        const searchMatch =
          searchQuery.trim() === "" ||
          bill.customerName
            ?.toLowerCase()
            .includes(
              searchQuery.toLowerCase()
            ) ||
          bill.phone
            ?.toLowerCase()
            .includes(
              searchQuery.toLowerCase()
            );

        return (
          staffMatch && searchMatch
        );
      });
    }, [
      pendingBills,
      selectedStaff,
      searchQuery,
    ]);
      /* ---------------- DATE CLICK ---------------- */

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);

    // IMPORTANT: Attendance logs are stored using the user's local date.
    // Do not use toISOString() here because it can shift an IST date
    // to the previous UTC date (e.g. Aug 11 -> Aug 10).
    const localDateKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

    const attendance = attendanceRecords.find(
      (record) => record.date === localDateKey
    );

    const holiday = getHoliday(
      holidays,
      date
    );

    setSelectedRecord(
      attendance || null
    );

    setSelectedHoliday(
      holiday || null
    );

    setAttendanceModalOpen(true);
  };

  const closeAttendanceModal = () => {
    setAttendanceModalOpen(false);

    setSelectedDate(null);

    setSelectedRecord(null);

    setSelectedHoliday(null);
  };

  /* ---------------- FILTERED STAFF RECORDS ---------------- */

  const staffRecords = useMemo(() => {
    if (selectedStaff === "All") {
      return records;
    }

    return records.filter(
      (record) =>
        record.staffName
          ?.toLowerCase()
          .trim() ===
        selectedStaff
          .toLowerCase()
          .trim()
    );
  }, [records, selectedStaff]);

  const staffPendingBills =
    useMemo(() => {
      if (selectedStaff === "All") {
        return pendingBills;
      }

      return pendingBills.filter(
        (bill) =>
          bill.staffName
            ?.toLowerCase()
            .trim() ===
          selectedStaff
            .toLowerCase()
            .trim()
      );
    }, [
      pendingBills,
      selectedStaff,
    ]);

  const attendanceRecords =
    useMemo(() => {
      // Dashboard attendance is saved when the staff member clicks Present.
      // Convert those logs to the existing PerformanceRecord shape so the
      // current Attendance UI can use them without changing the UI.
      const loginAttendanceRecords = attendanceLogs
        .map((log: any) => {
          const timestamp = log?.timestamp || log?.date;
          if (!timestamp || !log?.staffName) return null;

          const parsedDate = new Date(timestamp);
          if (Number.isNaN(parsedDate.getTime())) return null;

          const date = `${parsedDate.getFullYear()}-${String(
            parsedDate.getMonth() + 1
          ).padStart(2, "0")}-${String(
            parsedDate.getDate()
          ).padStart(2, "0")}`;

          return {
            id: log.id || `${log.staffName}-${date}`,
            date,
            staffName: log.staffName,
            loginTime: log.loginTime || "--",
            logoutTime: log.logoutTime || "--",
            totalServices: Number(log.totalServices || 0),
            departmentFee: Number(log.departmentFee || 0),
            serviceCharge: Number(log.serviceCharge || 0),
            cashAmount: Number(log.cashAmount || 0),
            gpayUpiAmount: Number(log.gpayUpiAmount || 0),
            commission: Number(log.commission || 0),
          } as PerformanceRecord;
        })
        .filter(Boolean) as PerformanceRecord[];

      // Preserve existing performance records as a fallback.
      const merged = [
        ...loginAttendanceRecords,
        ...records,
      ];

      const unique = new Map<string, PerformanceRecord>();
      merged.forEach((record) => {
        const key = `${(record.staffName || "").toLowerCase().trim()}|${record.date}`;
        if (!unique.has(key)) {
          unique.set(key, record);
        }
      });

      const allAttendance = Array.from(unique.values());

      if (selectedStaff === "All") {
        return allAttendance;
      }

      return allAttendance.filter(
        (record) =>
          record.staffName
            ?.toLowerCase()
            .trim() ===
          selectedStaff
            .toLowerCase()
            .trim()
      );
    }, [
      attendanceLogs,
      records,
      selectedStaff,
    ]);

  const selectedSalaryHistory =
    useMemo(() => {
      if (selectedStaff === "All") {
        return salaryHistory;
      }

      return salaryHistory.filter(
        (item) =>
          item.staffName
            ?.toLowerCase()
            .trim() ===
          selectedStaff
            .toLowerCase()
            .trim()
      );
    }, [
      salaryHistory,
      selectedStaff,
    ]);

  return (
    <div className="min-h-screen space-y-5 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-4 sm:p-5 lg:p-6">

      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex-row lg:items-center">

        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Staff Performance Dashboard
          </h1>

          <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
            Monitor attendance, performance,
            billing and salary.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <select
            value={selectedStaff}
            onChange={(e) =>
              setSelectedStaff(e.target.value)
            }
            disabled={
              currentUser &&
              currentUser.role?.toLowerCase() !==
                "admin"
            }
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-black text-slate-700 outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 disabled:bg-slate-100 disabled:text-slate-500 sm:w-72"
          >
            {staffList.map((staff) => (
              <option
                key={staff}
                value={staff}
              >
                {staff === "All"
                  ? "All Staff Members"
                  : staff}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SummaryCards
        records={staffRecords}
        attendanceLogs={attendanceRecords}
        selectedStaff={selectedStaff}
        dailyDate={summaryDate}
        setDailyDate={setSummaryDate}
        selectedMonth={summaryMonth}
        selectedYear={summaryYear}
        setSelectedMonth={setSummaryMonth}
        setSelectedYear={setSummaryYear}
        yearlyYear={summaryYear}
        setYearlyYear={setSummaryYear}
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50/60">

          <button
            onClick={() =>
              setActiveTab("pending")
            }
            className={`px-5 py-4 text-sm font-black transition-all ${
              activeTab === "pending"
                ? "border-b-2 border-cyan-500 text-cyan-700 bg-cyan-50/50"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            Pending Bills
          </button>

          <button
            onClick={() =>
              setActiveTab("billed")
            }
            className={`px-5 py-4 text-sm font-black transition-all ${
              activeTab === "billed"
                ? "border-b-2 border-cyan-500 text-cyan-700 bg-cyan-50/50"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            Billed Services
          </button>

          <button
            onClick={() =>
              setActiveTab("attendance")
            }
            className={`px-5 py-4 text-sm font-black transition-all ${
              activeTab === "attendance"
                ? "border-b-2 border-cyan-500 text-cyan-700 bg-cyan-50/50"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            Attendance
          </button>

          <button
            onClick={() =>
              setActiveTab("salary")
            }
            className={`px-5 py-4 text-sm font-black transition-all ${
              activeTab === "salary"
                ? "border-b-2 border-cyan-500 text-cyan-700 bg-cyan-50/50"
                : "text-slate-500 hover:bg-white hover:text-slate-800"
            }`}
          >
            Salary Summary
          </button>

        </div>

        <div className="p-5 sm:p-6">
                    {activeTab === "pending" && (
<PendingBills
  bills={staffPendingBills}
  selectedStaff={selectedStaff}
  searchQuery={searchQuery}
/>
          )}

          {activeTab === "billed" && (
<BilledServices
  records={filteredRecords}
  selectedStaff={selectedStaff}
  searchQuery={searchQuery}
/>
          )}

          {activeTab === "attendance" && (
            <AttendanceCalendar
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              records={attendanceRecords}
              holidays={holidays}
              selectedStaff={selectedStaff}
              onDateClick={handleDateClick}
            />
          )}

          {activeTab === "salary" && (
<SalarySection
  records={attendanceRecords}
  salaryHistory={selectedSalaryHistory}
  selectedStaff={selectedStaff}
  selectedMonth={summaryMonth}
  selectedYear={summaryYear}
  setSelectedMonth={setSummaryMonth}
  setSelectedYear={setSummaryYear}
  onOpenHistory={() =>
    setSalaryHistoryOpen(true)
  }
/>
          )}
        </div>
      </div>

<AttendanceModal
  open={attendanceModalOpen}
  onClose={closeAttendanceModal}
  date={selectedDate}
  record={selectedRecord}
  holiday={selectedHoliday}
  onHolidayChange={() => {
    setHolidays(loadHolidays());

    if (selectedDate) {
setSelectedHoliday(
  getHoliday(loadHolidays(), selectedDate) ?? null
);
    }
  }}
/>
    </div>
  );
}