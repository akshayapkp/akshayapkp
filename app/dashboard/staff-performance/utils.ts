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
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const indian = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (indian) {
    return `${indian[3]}-${String(Number(indian[2])).padStart(2, "0")}-${String(Number(indian[1])).padStart(2, "0")}`;
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
    const serviceEntries = JSON.parse(localStorage.getItem("serviceEntries") || "[]");
    const billedServices = JSON.parse(localStorage.getItem("billedServicesData") || "[]");
    const performance = JSON.parse(localStorage.getItem("performanceRecords") || "[]");

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

      const staffName = String(item.staffName || item.staff || "").trim();
      if (
        selectedStaff !== "All" &&
        staffName &&
        staffName.toLowerCase() !== selectedStaff.trim().toLowerCase()
      ) {
        return;
      }

      const billId = String(
        item.billId || item.billID || item.invoiceId || ""
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
      totals.count += qty;
    });

    if (!sources.length || totals.count === 0) {
      const fallback = (Array.isArray(performance) ? performance : []).filter(
        (record: any) => {
          const key = normalizeLocalDateKey(record.date || record.timestamp);
          const staffName = String(record.staffName || record.staff || "").trim();
          return (
            key === date &&
            (selectedStaff === "All" ||
              staffName.toLowerCase() === selectedStaff.trim().toLowerCase())
          );
        }
      );

      if (fallback.length) {
        return fallback.reduce(
          (sum, record: any) => ({
            departmentFee:
              sum.departmentFee + Number(record.departmentFee || 0),
            serviceCharge:
              sum.serviceCharge + Number(record.serviceCharge || 0),
            totalAmount:
              sum.totalAmount + Number(record.totalAmount || 0),
            count:
              sum.count + Number(record.totalServices || 0),
          }),
          { departmentFee: 0, serviceCharge: 0, totalAmount: 0, count: 0 }
        );
      }
    }

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