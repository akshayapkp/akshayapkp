import {
  PerformanceRecord,
  Holiday,
  PendingBill,
  SalaryHistory,
} from "./types";

export const STORAGE_KEYS = {
  RECORDS: "performanceRecords",
  PENDING_BILLS: "pendingBills",
  HOLIDAYS: "holidays",
  SALARY_HISTORY: "salaryHistory",
};

export interface DailyBilledTotals {
  departmentFee: number;
  serviceCharge: number;
  totalAmount: number;
  count: number;
}

export function normalizeLocalDateKey(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const makeValidatedDateKey = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) return "";
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T\s])/);
  if (iso) return makeValidatedDateKey(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const indian = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:$|[,\s])/);
  if (indian) {
    return makeValidatedDateKey(Number(indian[3]), Number(indian[2]), Number(indian[1]));
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

export function getDailyBilledTotals(
  date: string,
  selectedStaff: string = "All"
): DailyBilledTotals {
  if (typeof window === "undefined") {
    return { departmentFee: 0, serviceCharge: 0, totalAmount: 0, count: 0 };
  }

  try {
    /*
     * Staff Performance is the source used by the Daily/Monthly/Yearly
     * summary cards. Use the same records here so the calendar and
     * Attendance Details never show a different total for the same day.
     */
    const performance = JSON.parse(
      localStorage.getItem("performanceRecords") || "[]"
    );

    const normalizedSelectedStaff = selectedStaff.trim().replace(/\s+/g, " ").toLowerCase();
    const matchingCandidates = (Array.isArray(performance) ? performance : []).filter(
      (record: any) => {
        const key = normalizeLocalDateKey(record.date || record.timestamp);
        const staffName = String(record.staffName || record.staff || "").trim().replace(/\s+/g, " ").toLowerCase();

        return (
          key === date &&
          (normalizedSelectedStaff === "all" ||
            staffName === normalizedSelectedStaff)
        );
      }
    );

    // performanceRecords is a bill-summary store: one bill must contribute
    // once even if a legacy sync left duplicate rows with different record IDs.
    // Keep the first/newest occurrence in the stored newest-first order.
    const seenPerformanceBills = new Set<string>();
    const matching = matchingCandidates.filter((record: any, index: number) => {
      const billId = String(record.billId || record.billID || record.invoiceId || "").trim();
      const recordId = String(record.id || "").trim();
      // Do not guess that two legacy records are duplicates from matching
      // amounts/names alone; that could hide two genuine same-day bills.
      const identity = billId
        ? `bill:${billId}`
        : recordId
          ? `record:${recordId}`
          : `legacy-index:${index}`;
      if (seenPerformanceBills.has(identity)) return false;
      seenPerformanceBills.add(identity);
      return true;
    });

    if (matching.length > 0) {
      return matching.reduce(
        (sum, record: any) => ({
          departmentFee:
            sum.departmentFee + Number(record.departmentFee || 0),
          serviceCharge:
            sum.serviceCharge + Number(record.serviceCharge || 0),
          totalAmount:
            sum.totalAmount + Number(record.totalAmount || 0),
          // One performance record is a bill summary; totalServices is its item count.
          count:
            sum.count +
            (Number(record.totalServices || 0) > 0
              ? Number(record.totalServices)
              : 1),
        }),
        { departmentFee: 0, serviceCharge: 0, totalAmount: 0, count: 0 }
      );
    }

    /*
     * Fallback for installations where performanceRecords has not yet
     * been created: use the detailed billed-service data.
     */
    const serviceEntries = JSON.parse(
      localStorage.getItem("serviceEntries") || "[]"
    );
    const billedServices = JSON.parse(
      localStorage.getItem("billedServicesData") || "[]"
    );

    const sources = [
      ...(Array.isArray(serviceEntries) ? serviceEntries : []),
      ...(Array.isArray(billedServices) ? billedServices : []),
    ];

    const totals: DailyBilledTotals = {
      departmentFee: 0,
      serviceCharge: 0,
      totalAmount: 0,
      count: 0,
    };
    const seen = new Set<string>();

    sources.forEach((item: any, index: number) => {
      if (!item || typeof item !== "object") return;

      const key = normalizeLocalDateKey(
        item.dateTime || item.date || item.createdAt || item.timestamp
      );
      if (key !== date) return;

      const staffName = String(item.staffName || item.staff || "").trim().replace(/\s+/g, " ").toLowerCase();
      const normalizedFilterStaff = selectedStaff.trim().replace(/\s+/g, " ").toLowerCase();
      if (normalizedFilterStaff !== "all" && staffName !== normalizedFilterStaff) {
        return;
      }

      const billId = String(
        item.billId || item.billID || item.invoiceId || item.id || ""
      ).trim();
      const serviceName = String(
        item.serviceName || item.service || item.name || ""
      ).trim();
      const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
      const total = Number(item.totalAmount ?? item.total ?? 0) || 0;
      const signature = billId
        ? `${billId}|${serviceName}|${qty}|${total}`
        : `${key}|${staffName}|${serviceName}|${qty}|${total}|${index}`;

      if (seen.has(signature)) return;
      seen.add(signature);

      totals.departmentFee += Number(
        item.walletChg ??
          item.deptChg ??
          item.deptFee ??
          item.departmentFee ??
          0
      ) || 0;
      totals.serviceCharge += Number(
        item.srvChg ??
          item.srvCharge ??
          item.serviceCharge ??
          0
      ) || 0;
      totals.totalAmount += total;
      // A detailed row can represent multiple service units.
      totals.count += Math.max(1, Number(item.qty ?? item.quantity ?? 1) || 1);
    });

    return totals;
  } catch {
    return { departmentFee: 0, serviceCharge: 0, totalAmount: 0, count: 0 };
  }
}

export function loadPerformanceRecords(): PerformanceRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function loadPendingBills(): PendingBill[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_BILLS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function loadHolidays(): Holiday[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.HOLIDAYS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function loadSalaryHistory(): SalaryHistory[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.SALARY_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function savePerformanceRecords(
  records: PerformanceRecord[]
) {
  localStorage.setItem(
    STORAGE_KEYS.RECORDS,
    JSON.stringify(records)
  );
}

export function savePendingBills(
  bills: PendingBill[]
) {
  localStorage.setItem(
    STORAGE_KEYS.PENDING_BILLS,
    JSON.stringify(bills)
  );
}

export function saveSalaryHistory(
  history: SalaryHistory[]
) {
  localStorage.setItem(
    STORAGE_KEYS.SALARY_HISTORY,
    JSON.stringify(history)
  );
}

export function saveHolidays(
  holidays: Holiday[]
) {
  localStorage.setItem(
    STORAGE_KEYS.HOLIDAYS,
    JSON.stringify(holidays)
  );
}
export function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export function isSameDate(
  date1: Date,
  date2: Date
) {
  return formatDate(date1) === formatDate(date2);
}

export function getAttendanceRecord(
  records: PerformanceRecord[],
  date: Date
) {
  return records.find(
    (record) => record.date === formatDate(date)
  );
}

export function getHoliday(
  holidays: Holiday[],
  date: Date
) {
  return holidays.find(
    (holiday) => holiday.date === formatDate(date)
  );
}

export function getMonthlyRecords(
  records: PerformanceRecord[],
  month: number,
  year: number,
  staff?: string
) {
  return records.filter((record) => {
    const recordDate = new Date(record.date);

    const matchesStaff =
      !staff ||
      staff === "All" ||
      record.staffName?.toLowerCase() ===
        staff.toLowerCase();

    return (
      matchesStaff &&
      recordDate.getMonth() === month &&
      recordDate.getFullYear() === year
    );
  });
}

export function getYearlyRecords(
  records: PerformanceRecord[],
  year: number,
  staff?: string
) {
  return records.filter((record) => {
    const recordDate = new Date(record.date);

    const matchesStaff =
      !staff ||
      staff === "All" ||
      record.staffName?.toLowerCase() ===
        staff.toLowerCase();

    return (
      matchesStaff &&
      recordDate.getFullYear() === year
    );
  });
}

export function calculateTotal<T>(
  items: T[],
  selector: (item: T) => number
) {
  return items.reduce(
    (sum, item) => sum + selector(item),
    0
  );
}
export function getPresentDays(
  records: PerformanceRecord[]
) {
  return records.length;
}

export function getAbsentDays(
  records: PerformanceRecord[],
  month: number,
  year: number
) {
  const totalDays = new Date(
    year,
    month + 1,
    0
  ).getDate();

  return Math.max(
    totalDays - records.length,
    0
  );
}

export function sortByLatest<T extends { date: string }>(
  items: T[]
) {
  return [...items].sort(
    (a, b) =>
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
  );
}

export function sortSalaryHistory(
  history: SalaryHistory[]
) {
  return [...history].sort(
    (a, b) =>
      new Date(b.paymentDate).getTime() -
      new Date(a.paymentDate).getTime()
  );
}

export function getUniqueStaff(
  records: PerformanceRecord[]
) {
  return [
    "All",
    ...new Set(
      records
        .map((r) => r.staffName)
        .filter(Boolean)
    ),
  ];
}

export function currency(
  value: number
) {
  return Number(value || 0).toFixed(2);
}

export function number(
  value: number
) {
  return Number(value || 0);
}