"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Search, Download, Briefcase, ChevronDown, ChevronUp, 
  Pencil, Trash2, Calendar, RefreshCw, Phone
} from "lucide-react";

const CENTRAL_STORAGE_ROW_ID = 999999;
const CENTRAL_STORAGE_VERSION = 1;
const CENTRAL_STORAGE_KEY = "__smart_akshaya_shared_storage__";
const SHARED_STORAGE_KEYS = [
  "managedServices",
  "managedWallets",
  "walletTransactions",
  "managedCustomers",
  "savedBillsList",
  "serviceEntries",
  "smart_akshaya_bills",
  "performanceRecords",
  "billedServicesData",
  "deletedBillIds",
] as const;

type SharedStorageKey = (typeof SHARED_STORAGE_KEYS)[number];
type SharedStorage = Partial<Record<SharedStorageKey, any[]>>;

const readSharedArray = (key: SharedStorageKey): any[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const sharedIdentity = (item: any, key: SharedStorageKey) => {
  const id = item?.id ?? item?.billId ?? item?.staffId;
  if (id !== undefined && id !== null && String(id).trim()) return `id:${String(id)}`;
  if (key === 'managedCustomers') {
    return `customer:${String(item?.mobile ?? '').trim()}:${String(item?.name ?? '').trim().toLowerCase()}`;
  }
  if (key === 'managedServices') {
    return `service:${String(item?.name ?? '').trim().toLowerCase()}`;
  }
  return `value:${JSON.stringify(item)}`;
};

const mergeSharedArraysForRead = (remote: any[] = [], local: any[] = [], key: SharedStorageKey) => {
  const merged = new Map<string, any>();
  remote.forEach((item) => {
    if (item && typeof item === 'object') merged.set(sharedIdentity(item, key), item);
  });
  local.forEach((item) => {
    if (item && typeof item === 'object') {
      const identity = sharedIdentity(item, key);
      if (!merged.has(identity)) merged.set(identity, item);
    }
  });
  return Array.from(merged.values());
};

const loadCentralSharedStoreForBilledServices = async (): Promise<SharedStorage | null> => {
  try {
    // Supabase is only the shared-sync layer. Billed Services must continue
    // working from localStorage when the central row is unavailable, blocked
    // by RLS, or temporarily unreachable.
    const { data, error } = await supabase
      .from('feature_permissions')
      .select('id, permissions')
      .eq('id', CENTRAL_STORAGE_ROW_ID)
      .limit(1);

    if (error) {
      console.warn('Billed Services central storage is unavailable; using local data.');
      return null;
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!row) return null;

    const payload = row.permissions as any;
    if (!payload || typeof payload !== 'object') return null;
    if (payload.storageKey && payload.storageKey !== CENTRAL_STORAGE_KEY) return null;

    const remoteStore = payload.data as SharedStorage | undefined;
    return remoteStore && typeof remoteStore === 'object' ? remoteStore : null;
  } catch {
    // Never let central-storage failure break the Billed Services page.
    return null;
  }
};

const saveCentralSharedStoreForBilledServices = async (store: SharedStorage): Promise<boolean> => {
  try {
    const payload = {
      storageKey: CENTRAL_STORAGE_KEY,
      version: CENTRAL_STORAGE_VERSION,
      data: store,
    };

    // Prefer updating the existing central row.
    const { error: updateError } = await supabase
      .from('feature_permissions')
      .update({
        permissions: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', CENTRAL_STORAGE_ROW_ID);

    if (!updateError) return true;

    // If the row does not exist, try creating it. Any RLS/network failure is
    // intentionally silent because localStorage remains the safe fallback.
    const { error: insertError } = await supabase
      .from('feature_permissions')
      .insert({
        id: CENTRAL_STORAGE_ROW_ID,
        permissions: payload,
        updated_at: new Date().toISOString(),
      });

    return !insertError;
  } catch {
    return false;
  }
};

const refreshBilledServicesFromCentral = async () => {
  const remoteStore = await loadCentralSharedStoreForBilledServices();
  if (!remoteStore) return;

  const remoteDeleted = Array.isArray(remoteStore.deletedBillIds) ? remoteStore.deletedBillIds.map(String) : [];
  const localDeleted = readSharedArray('deletedBillIds').map(String);
  const deletedIds = Array.from(new Set([...remoteDeleted, ...localDeleted]));

  for (const key of SHARED_STORAGE_KEYS) {
    if (key === 'deletedBillIds') {
      localStorage.setItem(key, JSON.stringify(deletedIds));
      continue;
    }
    const remote = Array.isArray(remoteStore[key]) ? remoteStore[key] : [];
    const local = readSharedArray(key);
    let merged = mergeSharedArraysForRead(remote, local, key);

    if (key === 'serviceEntries') {
      const localBillIds = new Set(local.map((item: any) => String(item?.billId || item?.billID || item?.invoiceId || '').trim()).filter(Boolean));
      merged = [
        ...remote.filter((item: any) => {
          const billId = String(item?.billId || item?.billID || item?.invoiceId || '').trim();
          return !billId || !localBillIds.has(billId);
        }),
        ...local,
      ];
    }

    if (deletedIds.length) {
      merged = merged.filter((item: any) => !deletedIds.includes(String(item?.billId || item?.billID || item?.invoiceId || item?.id || '')));
    }
    localStorage.setItem(key, JSON.stringify(merged));
  }
};

interface BilledServiceItem {
  id: string;
  dateTime: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  quantity: number;
  totalAmount: number;
  receivedAmount: number;
  cashReceived: number;
  gpayAmount: number;
  pendingAmount: number;
  staffName: string;
  status: 'completed' | 'pending' | 'credit' | 'paid';
  originalData?: any[];
  billId?: string;
  serviceCount?: number;
  createdAt?: string;
}

const parseStoredDate = (value: unknown): number => {
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const direct = new Date(raw).getTime();
  if (Number.isFinite(direct)) return direct;

  const match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:,?\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return NaN;
  let hours = Number(match[4]);
  const minutes = Number(match[5]);
  const seconds = Number(match[6] || 0);
  const meridiem = String(match[7] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), hours, minutes, seconds).getTime();
};

const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export default function BilledServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<BilledServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => getTodayDateKey());
  const [endDate, setEndDate] = useState(() => getTodayDateKey());
  const [appliedStartDate, setAppliedStartDate] = useState(() => getTodayDateKey());
  const [appliedEndDate, setAppliedEndDate] = useState(() => getTodayDateKey());
  const [isCustomDateFilter, setIsCustomDateFilter] = useState(false);
  const [dateFilterError, setDateFilterError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentStaff, setCurrentStaff] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [staffList, setStaffList] = useState<string[]>([]);

  // localStorage-ൽ നിന്ന് ലൈവ് ഡാറ്റ വായിക്കുന്നു
  const loadBilledData = async () => {
    if (typeof window === 'undefined') return;

    try {
      await refreshBilledServicesFromCentral();

      // Billed Services can receive the same completed bill through more than
      // one shared storage key depending on which version of Service Entry
      // created/updated it. Read both stores and merge them for display.
      // serviceEntries remains the preferred source; billedServicesData fills
      // in bills that are missing from serviceEntries.
      const serviceEntriesRaw = JSON.parse(
        localStorage.getItem('serviceEntries') || '[]'
      );
      const billedServicesDataRaw = JSON.parse(
        localStorage.getItem('billedServicesData') || '[]'
      );
      const performanceRecordsRaw = JSON.parse(
        localStorage.getItem('performanceRecords') || '[]'
      );
      const savedBillsList = JSON.parse(
        localStorage.getItem('savedBillsList') || '[]'
      );

      const serviceEntries = Array.isArray(serviceEntriesRaw)
        ? serviceEntriesRaw
        : [];
      const billedServicesData = Array.isArray(billedServicesDataRaw)
        ? billedServicesDataRaw
        : [];
      const performanceRecords = Array.isArray(performanceRecordsRaw)
        ? performanceRecordsRaw
        : [];

      // Staff Performance uses performanceRecords as a live source for billed
      // records. Some older bills can exist there even when they are no longer
      // present in serviceEntries/billedServicesData. Therefore performanceRecords
      // must always participate in the display merge; it cannot be excluded just
      // because another store contains the same billId.
      //
      // The merge below removes duplicate service lines by signature while still
      // keeping additional service lines belonging to the same bill.
      const getBillKey = (item: any) => String(
        item?.billId || item?.billID || item?.invoiceId || item?.id || ''
      ).trim();

      const performanceEntries = performanceRecords.map((record: any) => ({
        id: record?.id,
        billId: record?.billId || record?.billID || record?.invoiceId || record?.id,
        dateTime: record?.timestamp || record?.dateTime || record?.date || '',
        createdAt: record?.timestamp || record?.createdAt || '',
        customerName: record?.customerName || record?.name || 'Customer',
        customerPhone:
          record?.customerPhone ||
          record?.mobileNumber ||
          record?.mobile ||
          record?.phone ||
          'N/A',
        serviceName: record?.serviceName || record?.service || '',
        quantity: Number(record?.quantity ?? record?.qty ?? 1) || 1,
        totalAmount: Number(record?.totalAmount ?? record?.total ?? 0) || 0,
        receivedAmount: Number(
          record?.receivedAmount ??
            record?.received ??
            record?.totalPaid ??
            record?.totalAmount ??
            record?.total ??
            0
        ) || 0,
        cashReceived: Number(record?.cashReceived ?? record?.cash ?? 0) || 0,
        gpayAmount: Number(record?.gpayAmount ?? record?.gpay ?? record?.upi ?? 0) || 0,
        pendingAmount: Number(
          record?.pendingAmount ??
            record?.balance ??
            record?.owedAmount ??
            0
        ) || 0,
        staffName: record?.staffName || record?.staff || 'Admin',
        status: record?.status || 'completed',
      }));

      // IMPORTANT: do not combine performanceRecords with the same bill from
      // serviceEntries/billedServicesData. Those stores contain the actual
      // service lines, while performanceRecords may also contain a bill-level
      // summary row. Combining both makes a fake extra "Service" line and can
      // double the bill total (for example ₹1 becomes ₹2).
      //
      // Source priority per bill:
      //   1) serviceEntries + billedServicesData
      //   2) performanceRecords only when the bill is absent above
      // This still recovers old bills that exist only in Staff Performance.
      const primarySourceEntries = [...serviceEntries, ...billedServicesData];
      const primaryBillKeys = new Set(
        primarySourceEntries
          .map(getBillKey)
          .filter(Boolean)
      );

      const performanceByBill = new Map<string, any[]>();
      performanceEntries.forEach((entry: any) => {
        const key = getBillKey(entry);
        if (!key || primaryBillKeys.has(key)) return;
        const group = performanceByBill.get(key) || [];
        group.push(entry);
        performanceByBill.set(key, group);
      });

      const cleanedPerformanceEntries: any[] = [];

      // Some older Performance records contain an automatic zero-value
      // placeholder immediately beside the real bill (for example Walk-in
      // ₹0.00). That placeholder is not a second bill and must never create a
      // second Billed Services row. Remove it only when a real, non-zero
      // performance record for the same staff/customer is present at nearly
      // the same timestamp. This keeps genuine old bills intact.
      const normalizedPerformanceKey = (entry: any) => [
        String(entry?.staffName || '').trim().toLowerCase(),
        String(entry?.customerName || '').trim().toLowerCase(),
        String(entry?.customerPhone || '').trim().toLowerCase(),
      ].join('|');

      const performanceTimestamp = (entry: any) =>
        parseBillDateTime(entry?.dateTime) || parseStoredDate(entry?.createdAt) || 0;

      const isZeroPlaceholder = (entry: any) => {
        const name = String(entry?.serviceName || '').trim().toLowerCase();
        const total = Number(entry?.totalAmount ?? 0) || 0;
        const received = Number(entry?.receivedAmount ?? 0) || 0;
        const cash = Number(entry?.cashReceived ?? 0) || 0;
        const gpay = Number(entry?.gpayAmount ?? 0) || 0;
        const pending = Number(entry?.pendingAmount ?? 0) || 0;
        const serviceCharge = Number(entry?.srvChg ?? entry?.srvCharge ?? entry?.serviceCharge ?? 0) || 0;
        const departmentFee = Number(entry?.walletChg ?? entry?.deptChg ?? entry?.deptFee ?? entry?.departmentFee ?? 0) || 0;
        const genericName = [
          'walk-in',
          'walk in',
          'service',
          'select service',
          'select a service',
        ].includes(name);

        return genericName &&
          total === 0 &&
          received === 0 &&
          cash === 0 &&
          gpay === 0 &&
          pending === 0 &&
          serviceCharge === 0 &&
          departmentFee === 0;
      };

      const allPerformanceEntries = performanceRecords.map((record: any) => {
        const matching = performanceEntries.find((entry: any) => entry.id === record?.id);
        return matching || record;
      });

      const hasRealNearbyPerformanceEntry = (entry: any) => {
        if (!isZeroPlaceholder(entry)) return false;
        const key = normalizedPerformanceKey(entry);
        const time = performanceTimestamp(entry);
        return allPerformanceEntries.some((candidate: any) => {
          if (!candidate || candidate === entry || isZeroPlaceholder(candidate)) return false;
          const candidateTime = performanceTimestamp(candidate);
          if (!time || !candidateTime || Math.abs(candidateTime - time) > 5 * 60 * 1000) return false;
          return normalizedPerformanceKey(candidate) === key && Number(candidate?.totalAmount ?? 0) > 0;
        });
      };

      performanceByBill.forEach((entries) => {
        const meaningful = entries.filter((entry: any) => {
          const name = String(entry?.serviceName || '').trim().toLowerCase();
          if (!name) return false;
          if (hasRealNearbyPerformanceEntry(entry)) return false;
          return !['service', 'select service', 'select a service'].includes(name);
        });

        // If every entry in an old performance bill was a zero placeholder,
        // retain one entry so the historical bill is not silently lost.
        if (meaningful.length > 0) {
          cleanedPerformanceEntries.push(...meaningful);
        } else {
          const fallback = entries.find((entry: any) => !hasRealNearbyPerformanceEntry(entry));
          if (fallback) cleanedPerformanceEntries.push(fallback);
        }
      });

      const sourceEntries = [
        ...primarySourceEntries,
        ...cleanedPerformanceEntries,
      ];

      // Remove exact duplicate service lines without merging legitimate
      // different services from the same bill.
      const getEntrySignature = (item: any) => [
        getBillKey(item),
        String(item?.serviceName || item?.service || '').trim().toLowerCase(),
        Number(item?.quantity ?? item?.qty ?? 1) || 1,
        Number(item?.totalAmount ?? item?.total ?? 0) || 0,
        Number(item?.srvChg ?? item?.srvCharge ?? item?.serviceCharge ?? 0) || 0,
        Number(item?.walletChg ?? item?.deptChg ?? item?.deptFee ?? item?.departmentFee ?? 0) || 0,
        String(item?.staffName || item?.staff || '').trim().toLowerCase(),
        String(item?.dateTime || item?.date || item?.createdAt || item?.timestamp || '').trim(),
        String(item?.customerName || item?.name || item?.customerPhone || item?.mobile || '').trim().toLowerCase(),
      ].join('|');

      const mergedSourceEntries: any[] = [];
      const seenEntrySignatures = new Set<string>();

      sourceEntries.forEach((item: any) => {
        if (!item || typeof item !== 'object') return;
        const signature = getEntrySignature(item);
        if (seenEntrySignatures.has(signature)) return;
        seenEntrySignatures.add(signature);
        mergedSourceEntries.push(item);
      });

      const savedBillsById = new Map<string, any>();
      if (Array.isArray(savedBillsList)) {
        savedBillsList.forEach((bill: any) => {
          const key = String(bill.billId || bill.id || '').trim();
          if (key) savedBillsById.set(key, bill);
        });
      }

      if (!mergedSourceEntries.length) {
        setServices([]);
        return;
      }

      const billedEntries = mergedSourceEntries.filter((item: any) => {
        const billKey = String(
          item.billId || item.billID || item.invoiceId || item.id || ''
        ).trim();
        const savedBill = savedBillsById.get(billKey);

        const itemStatus = String(item.status ?? '').trim().toLowerCase();
        const pending = Number(item.pendingAmount ?? item.balance ?? 0);

        // IMPORTANT:
        // A Save Bill creates a serviceEntries record too, but it is only a
        // draft until the user later opens it and chooses Complete Bill.
        // Therefore, when a matching saved bill exists, its current status
        // decides whether it belongs in Billed Services.
        if (savedBill) {
          const savedStatus = String(savedBill.status ?? '').trim().toLowerCase();
          const savedBalance = Number(
            savedBill.balance ?? savedBill.owedAmount ?? savedBill.pendingAmount ?? 0
          );

          const savedIsCredit =
            savedStatus === 'credit' ||
            savedStatus === 'pending' ||
            savedBalance > 0;

          const savedIsCompleted =
            savedStatus === 'completed' ||
            savedStatus === 'paid' ||
            (savedStatus !== '' && savedBalance <= 0 && savedStatus !== 'pending' && savedStatus !== 'credit');

          // Still only a Saved Bill / draft -> do NOT show it here.
          if (!savedIsCredit && !savedIsCompleted) return false;

          // Saved Bill was later completed or converted to credit -> show it.
          return savedIsCredit || savedIsCompleted;
        }

        // Bills that were never saved: show both completed/paid and credit.
        const isCredit =
          itemStatus === 'credit' ||
          itemStatus === 'pending' ||
          pending > 0;

        const isCompleted =
          itemStatus === 'completed' ||
          itemStatus === 'paid';

        return isCredit || isCompleted;
      });

      // One displayed row must represent one complete bill.
      // serviceEntries intentionally stores one record per service, so group
      // those records by billId for the Billed Services UI only.
      const groupedBills = new Map<string, { entries: any[]; firstIndex: number }>();
      billedEntries.forEach((entry: any, entryIndex: number) => {
        const key = String(
          entry.billId || entry.billID || entry.invoiceId || entry.id || ''
        ).trim();
        const existing = groupedBills.get(key);
        if (existing) {
          existing.entries.push(entry);
        } else {
          // serviceEntries is stored newest-first (new bills use unshift).
          // Keep that storage order instead of reparsing locale date strings.
          groupedBills.set(key, { entries: [entry], firstIndex: entryIndex });
        }
      });

      const formattedEntries = Array.from(groupedBills.entries()).map(
        ([billKey, group], index) => {
          const billItems = group.entries;
          const firstItem = billItems[0] || {};
          const savedBill = savedBillsById.get(billKey);

          const totalAmount = billItems.reduce(
            (sum: number, entry: any) => sum + Number(entry.totalAmount ?? entry.total ?? 0),
            0
          );
          const receivedAmount = billItems.reduce(
            (sum: number, entry: any) => sum + Number(entry.receivedAmount ?? entry.received ?? 0),
            0
          );
          const cashReceived = billItems.reduce(
            (sum: number, entry: any) => sum + Number(entry.cashReceived ?? 0),
            0
          );
          const gpayAmount = billItems.reduce(
            (sum: number, entry: any) => sum + Number(entry.gpayAmount ?? entry.gpay ?? 0),
            0
          );
          const entryPending = billItems.reduce(
            (sum: number, entry: any) => sum + Number(entry.pendingAmount ?? entry.balance ?? 0),
            0
          );
          const pendingAmount = Number(
            savedBill?.balance ?? savedBill?.owedAmount ?? savedBill?.pendingAmount ?? entryPending
          ) || 0;

          const rawStatus = String(
            savedBill?.status ?? firstItem.status ?? ''
          ).trim().toLowerCase();
          const displayStatus =
            rawStatus === 'credit' || rawStatus === 'pending' || pendingAmount > 0
              ? 'credit'
              : 'completed';

          const serviceNames = billItems.map((entry: any) => ({
            name: String(entry.serviceName || entry.service || 'Service'),
            quantity: Number(entry.quantity) || 1,
          }));

          return {
            id: billKey || firstItem.id || `bill-${index}-${Date.now()}`,
            billId: billKey,
            dateTime:
              savedBill?.dateTime ||
              firstItem.dateTime ||
              firstItem.date ||
              new Date().toLocaleString(),
            createdAt:
              savedBill?.createdAt ||
              firstItem.createdAt ||
              '',
            customerName:
              savedBill?.customerName ||
              firstItem.customerName ||
              firstItem.name ||
              'Customer',
            customerPhone:
              savedBill?.mobile ||
              savedBill?.mobileNumber ||
              firstItem.customerPhone ||
              firstItem.phone ||
              firstItem.mobile ||
              'N/A',
            // Keep the first service in the compact row. The complete list is
            // shown inside View, so one bill never becomes multiple rows.
            serviceName: serviceNames[0]?.name || 'Service',
            quantity: serviceNames[0]?.quantity || 1,
            serviceCount: serviceNames.length,
            totalAmount: Number(savedBill?.totalAmount ?? totalAmount) || 0,
            receivedAmount: Number(savedBill?.totalPaid ?? receivedAmount) || 0,
            cashReceived: Number(savedBill?.cash ?? cashReceived) || 0,
            gpayAmount: Number(savedBill?.gpay ?? gpayAmount) || 0,
            pendingAmount,
            staffName:
              savedBill?.staffName ||
              firstItem.staffName ||
              firstItem.staff ||
              'Admin',
            status: displayStatus as 'completed' | 'credit',
            originalData: billItems,
          };
        }
      );

      // Always show the most recently entered bill first. Use the stored bill
      // timestamp, including Indian DD/MM/YYYY locale strings and ISO values.
      const orderedEntries = [...formattedEntries].sort((a, b) => {
        const aTime = parseBillDateTime(a.dateTime) || parseStoredDate(a.createdAt) || 0;
        const bTime = parseBillDateTime(b.dateTime) || parseStoredDate(b.createdAt) || 0;
        return bTime - aTime;
      });

      setServices(orderedEntries);
    } catch (e) {
      console.error('Error loading billed services', e);
      setServices([]);
    }
  };

  // Keep the default TODAY filter in sync when the calendar date changes.
  // A custom date-range search remains unchanged until the user clears it.
  useEffect(() => {
    if (isCustomDateFilter) return;

    const updateTodayFilter = () => {
      const today = getTodayDateKey();
      setStartDate(today);
      setEndDate(today);
      setAppliedStartDate(today);
      setAppliedEndDate(today);
    };

    updateTodayFilter();

    const intervalId = window.setInterval(updateTodayFilter, 60_000);

    return () => window.clearInterval(intervalId);
  }, [isCustomDateFilter]);

  useEffect(() => {
    const loadUserAndStaff = async () => {
      if (typeof window === 'undefined') return;

      let loggedStaff = '';
      let loggedRole = '';

      try {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          loggedStaff = String(parsedUser.username || parsedUser.name || '').trim();
          loggedRole = String(parsedUser.role || '').toLowerCase().trim();
        }
      } catch (error) {
        console.error('Failed to read loggedInUser', error);
      }

      setCurrentStaff(loggedStaff);
      setCurrentRole(loggedRole);

      const loggedIsAdmin =
        loggedRole.includes('admin') ||
        loggedStaff.toLowerCase() === 'admin' ||
        loggedStaff.toLowerCase() === 'admin user';

      if (!loggedIsAdmin && loggedStaff) {
        setSelectedStaff(loggedStaff);
      }

      // Read all known staff storage keys so the dropdown contains the
      // actual Staff Management list instead of only "All Staff".
      const possibleKeys = [
        'smart_akshaya_staff',
        'managedStaff',
        'staff_members',
        'users',
        'akshaya_staffs',
        'smart_akshaya_staffs',
      ];

      const loadedNames: string[] = [];

      for (const key of possibleKeys) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;

          const parsed = JSON.parse(raw);
          const staffArray =
            Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed?.staff)
                ? parsed.staff
                : Array.isArray(parsed?.staffs)
                  ? parsed.staffs
                  : Array.isArray(parsed?.data)
                    ? parsed.data
                    : [];

          staffArray.forEach((staff: any) => {
            const name = String(
              staff?.name ??
              staff?.staffName ??
              staff?.username ??
              staff?.userName ??
              staff?.firstName ??
              ''
            ).trim();

            if (name) loadedNames.push(name);
          });
        } catch (error) {
          console.error(`Failed to read staff key "${key}"`, error);
        }
      }

      try {
        const serviceEntries = JSON.parse(
          localStorage.getItem('serviceEntries') || '[]'
        );
        if (Array.isArray(serviceEntries)) {
          serviceEntries.forEach((item: any) => {
            const name = String(item?.staffName || item?.staff || '').trim();
            if (name) loadedNames.push(name);
          });
        }

        const savedBills = JSON.parse(
          localStorage.getItem('savedBillsList') || '[]'
        );
        if (Array.isArray(savedBills)) {
          savedBills.forEach((bill: any) => {
            const name = String(bill?.staffName || bill?.staff || '').trim();
            if (name) loadedNames.push(name);
          });
        }
      } catch (error) {
        console.error('Failed to read staff names from bill data', error);
      }

      if (loggedStaff) loadedNames.push(loggedStaff);

      const uniqueNames = Array.from(
        new Set(loadedNames.filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      const finalStaffList = uniqueNames.length > 0
        ? uniqueNames
        : ['Admin User', 'FASNIL', 'SUMAYYA', 'SHEEJA', 'SAHLA'];

      setStaffList(finalStaffList);
      await loadBilledData();
    };

    loadUserAndStaff();
  }, []);


  const normalizedRole = String(currentRole || '').trim().toLowerCase();
  const normalizedStaff = String(currentStaff || '').trim().toLowerCase();
  const isAdmin =
    normalizedRole.includes('admin') ||
    normalizedStaff === 'admin' ||
    normalizedStaff === 'admin user';

  const parseBillDateTime = (value: unknown): number => {
    const raw = String(value ?? '').trim();
    if (!raw) return NaN;

    const native = new Date(raw).getTime();
    if (Number.isFinite(native)) return native;

    // Service Entry stores dateTime using the browser's locale string.
    // In India this is commonly DD/MM/YYYY, which Date.parse() does not
    // reliably understand across browsers.
    const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return NaN;

    const [, day, month, year, hourText, minuteText, secondText = '0', meridiem] = match;
    let hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    if (meridiem) {
      const lower = meridiem.toLowerCase();
      if (lower === 'pm' && hour < 12) hour += 12;
      if (lower === 'am' && hour === 12) hour = 0;
    }

    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, minute, second);
    return Number.isNaN(date.getTime()) ? NaN : date.getTime();
  };

  const formatDisplayDateTime = (value: unknown) => {
    const raw = String(value ?? '').trim();
    const timeValue = parseBillDateTime(raw);
    if (!Number.isFinite(timeValue)) {
      return { date: raw, time: '' };
    }

    const date = new Date(timeValue);
    return {
      date: date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }),
    };
  };

  const canModifyService = (item: BilledServiceItem) => {
    if (isAdmin) return true;

    const createdAt = parseStoredDate(item.createdAt) || parseBillDateTime(item.dateTime);
    if (!Number.isFinite(createdAt)) return false;

    return Date.now() - createdAt <= 5 * 60 * 1000;
  };

  const handleDelete = async (id: string) => {
    const item = services.find((service) => service.id === id);
    if (!item) return;

    if (!isAdmin && !canModifyService(item)) {
      alert('The 5-minute edit/delete time limit has expired. Only Admin can modify this entry now.');
      return;
    }

    if (!confirm("Are you sure you want to delete this bill?")) return;

    try {
      const rawEntries = JSON.parse(localStorage.getItem('serviceEntries') || '[]');
      const billKey = String(item.billId || item.id || '').trim();
      const updatedEntries = Array.isArray(rawEntries)
        ? rawEntries.filter((entry: any) => {
            const entryBillKey = String(
              entry.billId || entry.billID || entry.invoiceId || entry.id || ''
            ).trim();
            return entryBillKey !== billKey;
          })
        : [];

      localStorage.setItem('serviceEntries', JSON.stringify(updatedEntries));
      localStorage.setItem('billedServicesData', JSON.stringify(updatedEntries));

      const deletedIds = Array.from(new Set([
        ...readSharedArray('deletedBillIds').map(String),
        billKey,
      ]));
      localStorage.setItem('deletedBillIds', JSON.stringify(deletedIds));

      // Persist the deletion marker together with the latest shared snapshot.
      // The marker prevents another PC's stale local cache from resurrecting
      // this bill after refresh.
      const remoteStore = await loadCentralSharedStoreForBilledServices();
      const central: SharedStorage = remoteStore ? { ...remoteStore } : {};
      central.deletedBillIds = deletedIds;
      for (const key of SHARED_STORAGE_KEYS) {
        if (key === 'deletedBillIds') continue;
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        central[key] = Array.isArray(current)
          ? current.filter((entry: any) => String(entry?.billId || entry?.billID || entry?.invoiceId || entry?.id || '') !== billKey)
          : [];
      }
      await saveCentralSharedStoreForBilledServices(central);

      setServices((current) => current.filter((service) => service.id !== id));
    } catch (error) {
      console.error('Failed to delete billed bill:', error);
      alert('Unable to delete this bill.');
    }
  };

  // Edit is intentionally NOT performed inside Billed Services.
  // It opens the original Service Entry screen so service charges,
  // department/wallet charges, payment method and credit status all
  // recalculate together.
  const handleOpenEdit = (item: BilledServiceItem) => {
    if (!isAdmin && !canModifyService(item)) {
      alert('The 5-minute edit time limit has expired. Only Admin can edit this entry now.');
      return;
    }

    try {
      localStorage.setItem(
        'serviceEntryEditData',
        JSON.stringify({
          id: item.id,
          billId: item.billId || item.id,
          customerName: item.customerName,
          mobile: item.customerPhone,
          customerPhone: item.customerPhone,
          totalAmount: item.totalAmount,
          receivedAmount: item.receivedAmount,
          cashReceived: item.cashReceived,
          gpayAmount: item.gpayAmount,
          totalPaid: item.receivedAmount,
          cash: item.cashReceived,
          gpay: item.gpayAmount,
          previousBalance: 0,
          pendingAmount: item.pendingAmount,
          staffName: item.staffName,
          dateTime: item.dateTime,
          status: item.status,
          createdAt: item.createdAt || new Date().toISOString(),
          items: Array.isArray(item.originalData)
            ? [...item.originalData].reverse().map((entry: any) => ({
                id: entry.id,
                name: entry.serviceName || entry.service || 'Service',
                wallet: entry.wallet || entry.defaultWallet || 'Select Wallet',
                walletChg: Number(entry.walletChg ?? entry.deptChg ?? entry.deptFee ?? 0),
                srvChg: Number(entry.srvChg ?? entry.srvCharge ?? entry.serviceCharge ?? 0),
                qty: Number(entry.quantity ?? entry.qty ?? 1) || 1,
                status: 'Completed',
              }))
            : [],
          serviceName: item.serviceName,
          quantity: item.quantity,
        })
      );

      router.push(`/dashboard/service-entry?edit=${encodeURIComponent(item.id)}`);
    } catch (error) {
      console.error('Failed to prepare service edit', error);
      alert('Unable to open this bill for editing.');
    }
  };

  const handleExportExcel = () => {
    const rows = filteredServices.map((item) => ({
      'Date / Time': item.dateTime,
      Customer: item.customerName,
      Mobile: item.customerPhone,
      Service: item.serviceName,
      Quantity: item.quantity,
      Total: item.totalAmount,
      Received: item.receivedAmount,
      Cash: item.cashReceived,
      'GPay / UPI': item.gpayAmount,
      Pending: item.pendingAmount,
      Staff: item.staffName,
      Status: item.status,
    }));

    const headers = Object.keys(rows[0] || {
      'Date / Time': '',
      Customer: '',
      Mobile: '',
      Service: '',
      Quantity: '',
      Total: '',
      Received: '',
      Cash: '',
      'GPay / UPI': '',
      Pending: '',
      Staff: '',
      Status: '',
    });

    const escapeHtml = (value: unknown) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const htmlTable = `
      <table border="1">
        <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        ${rows.map((row) => `
          <tr>
            ${headers.map((header) => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`).join('')}
          </tr>
        `).join('')}
      </table>
    `;

    const blob = new Blob(
      [`\ufeff<html><head><meta charset="UTF-8"></head><body>${htmlTable}</body></html>`],
      { type: 'application/vnd.ms-excel;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billed-services-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

 const effectiveStaffFilter = isAdmin ? selectedStaff : currentStaff;

  const handleDateSearch = () => {
    setDateFilterError('');

    if (startDate && endDate && startDate > endDate) {
      setDateFilterError('From Date cannot be after To Date.');
      return;
    }

    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setIsCustomDateFilter(Boolean(startDate || endDate));
  };

  const handleClearDateFilter = () => {
    const today = getTodayDateKey();

    setStartDate(today);
    setEndDate(today);
    setAppliedStartDate(today);
    setAppliedEndDate(today);
    setIsCustomDateFilter(false);
    setDateFilterError('');
  };

  const getBillDateKey = (value: unknown): string => {
    const raw = String(value ?? '').trim();

    if (!raw) return '';

    const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoDateOnly) {
      return `${isoDateOnly[1]}-${isoDateOnly[2]}-${isoDateOnly[3]}`;
    }

    const indianDate = raw.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/
    );

    if (indianDate) {
      const day = String(Number(indianDate[1])).padStart(2, '0');
      const month = String(Number(indianDate[2])).padStart(2, '0');
      const year = indianDate[3];

      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    return '';
  };

  const filteredServices = services.filter((s) => {
    const billStaff = String(s.staffName || '')
      .trim()
      .toLowerCase();

    const selectedStaffName = String(effectiveStaffFilter || '')
      .trim()
      .toLowerCase();

    const matchesStaff =
      selectedStaffName === 'all'
        ? true
        : billStaff === selectedStaffName;

    if (!matchesStaff) return false;

    const storedDate =
      s.dateTime ||
      s.createdAt ||
      '';

    const billDateKey = getBillDateKey(storedDate);

    if (!billDateKey) return false;

    if (appliedStartDate && billDateKey < appliedStartDate) {
      return false;
    }

    if (appliedEndDate && billDateKey > appliedEndDate) {
      return false;
    }

    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return true;
    }

    const customerName = String(s.customerName || '').toLowerCase();
    const customerPhone = String(s.customerPhone || '').toLowerCase();
    const serviceName = String(s.serviceName || '').toLowerCase();

    const matchesOriginalService =
      Array.isArray(s.originalData) &&
      s.originalData.some((entry: any) =>
        String(entry?.serviceName || entry?.service || '')
          .toLowerCase()
          .includes(search)
      );

    return (
      customerName.includes(search) ||
      customerPhone.includes(search) ||
      serviceName.includes(search) ||
      matchesOriginalService
    );
  });

  // Summary Calculations
  const totalRevenue = filteredServices.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalReceived = filteredServices.reduce((sum, s) => sum + Math.abs(s.receivedAmount), 0);
  const totalPending = filteredServices.reduce((sum, s) => sum + s.pendingAmount, 0);
  const completedCount = filteredServices.filter(s => s.status === 'completed' || s.status === 'paid').length;


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800">Billed Services</h1>
        <button onClick={loadBilledData} className="text-slate-500 hover:text-slate-700 transition flex items-center gap-1.5 text-xs font-semibold bg-white border px-3 py-1.5 rounded-lg shadow-xs">
          <RefreshCw size={14} /> Sync Data
        </button>
      </div>

      {/* TOP BLUE BANNER */}
      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-wrap items-center gap-8 md:gap-12">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-200">TOTAL REVENUE</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-1">₹{totalRevenue.toFixed(2)}</h2>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">RECEIVED</p>
            <p className="text-xl font-bold mt-1">₹{totalReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">PENDING</p>
            <p className="text-xl font-bold mt-1">₹{totalPending.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-blue-500/50 border border-blue-400/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <div className="p-2 bg-blue-400/30 rounded-lg">
            <Briefcase size={22} className="text-white" />
          </div>
          <div>
            <p className="text-2xl font-black leading-none">{completedCount}</p>
            <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider mt-1">COMPLETED SERVICES</p>
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800">Service Entries</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2 bg-white text-xs w-full sm:w-64 focus-within:ring-2 focus-within:ring-blue-500 shadow-xs">
            <Search size={16} className="text-slate-400 mr-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search name, mobile, service..." 
              className="bg-transparent outline-none w-full text-slate-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-xs text-slate-500 shadow-xs">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateFilterError('');
              }}
              className="outline-none bg-transparent"
              aria-label="From Date"
            />
            <span>→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateFilterError('');
              }}
              className="outline-none bg-transparent"
              aria-label="To Date"
            />
          </div>

          <button
            type="button"
            onClick={handleDateSearch}
            className="border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Search size={14} /> Search
          </button>

          {(appliedStartDate || appliedEndDate || dateFilterError) && (
            <button
              type="button"
              onClick={handleClearDateFilter}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition shadow-xs"
            >
              Clear
            </button>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs shadow-xs">
            <span className="font-semibold text-blue-500">Staff</span>

            {isAdmin ? (
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="bg-transparent font-bold text-blue-800 outline-none cursor-pointer"
                aria-label="Filter billed services by staff"
              >
                <option value="ALL">All Staff</option>
                {staffList
                  .filter((name) => name.trim().toLowerCase() !== 'admin user')
                  .map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
              </select>
            ) : (
              <span className="font-bold text-blue-800">
                {currentStaff || 'Current Staff'}
              </span>
            )}
          </div>

          <button onClick={handleExportExcel} className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs">
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* TABLE — Staff Performance style */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="hidden md:grid grid-cols-12 bg-slate-50/80 border-b border-slate-200 py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2">DATE / TIME</div>
          <div className="col-span-2">CUSTOMER DETAILS</div>
          <div className="col-span-1">STAFF NAME</div>
          <div className="col-span-1 text-right">SERVICE CHG.</div>
          <div className="col-span-1 text-right">DEPT FEE</div>
          <div className="col-span-1 text-right">TOTAL AMOUNT</div>
          <div className="col-span-1 text-right">RECEIVED</div>
          <div className="col-span-1 text-center">STATUS</div>
          <div className="col-span-2 text-right">ACTIONS</div>
        </div>

        {filteredServices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No billed services found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredServices.map((item) => {
              const isExpanded = expandedId === item.id;
              const originalEntries = Array.isArray(item.originalData) ? item.originalData : [];
              const serviceCharge = originalEntries.reduce(
                (sum: number, entry: any) =>
                  sum + Number(entry?.srvChg ?? entry?.srvCharge ?? entry?.serviceCharge ?? 0),
                0
              );
              const departmentFee = originalEntries.reduce(
                (sum: number, entry: any) =>
                  sum + Number(entry?.walletChg ?? entry?.deptChg ?? entry?.deptFee ?? 0),
                0
              );

              return (
                <div key={item.id} className="transition">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : item.id);
                      }
                    }}
                    className={`grid grid-cols-1 md:grid-cols-12 items-center py-3.5 px-6 text-xs text-slate-700 gap-2 md:gap-0 cursor-pointer transition ${
                      isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                    }`}
                    title="Click this bill to view details"
                  >
                    <div className="col-span-2 text-slate-500 font-medium flex items-center gap-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isExpanded ? 'border-blue-200 bg-blue-100 text-blue-600' : 'border-transparent text-slate-300'}`}>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span>{formatDisplayDateTime(item.dateTime).date}</span>
                        <span className="text-[10px] text-slate-400">{formatDisplayDateTime(item.dateTime).time}</span>
                      </span>
                    </div>

                    <div className="col-span-2 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.customerName}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Phone size={11} className="text-blue-500 shrink-0" />
                        <span className="truncate">{item.customerPhone || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="col-span-1 min-w-0">
                      <span
                        className="inline-flex max-w-full truncate rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700"
                        title={item.staffName || 'Not Assigned'}
                      >
                        {item.staffName || 'Not Assigned'}
                      </span>
                    </div>

                    <div className="col-span-1 text-right font-bold text-emerald-600">
                      ₹{serviceCharge.toFixed(2)}
                    </div>

                    <div className="col-span-1 text-right font-bold text-orange-500">
                      ₹{departmentFee.toFixed(2)}
                    </div>

                    <div className="col-span-1 text-right font-black text-slate-800">
                      ₹{item.totalAmount.toFixed(2)}
                    </div>

                    <div className="col-span-1 text-right font-bold text-emerald-600">
                      ₹{item.receivedAmount.toFixed(2)}
                    </div>

                    <div className="col-span-1 text-center">
                      {Number(item.pendingAmount) > 0 || String(item.status).toLowerCase() === 'credit' ? (
                        <span className="inline-flex items-center justify-center text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-200 whitespace-nowrap">
                          CREDIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 whitespace-nowrap">
                          PAID
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        title={isAdmin ? 'Edit (Admin)' : canModifyService(item) ? 'Edit (available for 5 minutes)' : 'Edit time expired - Admin only'}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                          isAdmin || canModifyService(item)
                            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                            : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                        }`}
                      >
                        <Pencil size={13} />
                        <span className="hidden xl:inline">Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        title={isAdmin ? 'Delete (Admin)' : canModifyService(item) ? 'Delete (available for 5 minutes)' : 'Delete time expired - Admin only'}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                          isAdmin || canModifyService(item)
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'
                            : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 size={13} />
                        <span className="hidden xl:inline">Delete</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50/70 border-t border-b border-blue-100 p-4 mx-4 my-2 rounded-xl grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                      {/* Bill information */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3">BILL INFORMATION</p>
                        <div className="space-y-2">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Bill No</span>
                            <strong className="text-slate-800 text-right">{item.billId || item.id}</strong>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Date &amp; Time</span>
                            <strong className="text-slate-800 text-right">{item.dateTime}</strong>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Customer</span>
                            <strong className="text-slate-800 text-right">{item.customerName} ({item.customerPhone || 'N/A'})</strong>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Staff</span>
                            <strong className="text-indigo-600 text-right">{item.staffName}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Services */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3">SERVICES</p>
                        <div className="overflow-hidden rounded-lg border border-slate-100">
                          <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">
                            <span className="col-span-1">#</span>
                            <span className="col-span-6">SERVICE NAME</span>
                            <span className="col-span-2 text-right">QTY</span>
                            <span className="col-span-3 text-right">AMOUNT</span>
                          </div>
                          {originalEntries.length > 0 ? (
                            originalEntries.map((entry: any, serviceIndex: number) => (
                              <div key={`${item.id}-service-${serviceIndex}`} className="grid grid-cols-12 px-3 py-2 border-t border-slate-100 text-[11px] text-slate-700">
                                <span className="col-span-1 text-slate-400">{serviceIndex + 1}</span>
                                <span className="col-span-6 font-medium">{entry.serviceName || entry.service || 'Service'}</span>
                                <span className="col-span-2 text-right">{Number(entry.quantity ?? entry.qty ?? 1) || 1}</span>
                                <span className="col-span-3 text-right font-bold">₹{Number(entry.totalAmount ?? entry.total ?? 0).toFixed(2)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-slate-400">No service details available.</div>
                          )}
                        </div>
                        <div className="mt-3 space-y-1.5 text-[11px]">
                          <div className="flex justify-between"><span className="text-slate-500">Service Charge</span><strong className="text-emerald-600">₹{serviceCharge.toFixed(2)}</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Dept Fee</span><strong className="text-orange-500">₹{departmentFee.toFixed(2)}</strong></div>
                          <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="font-bold text-slate-700">Total Amount</span><strong className="text-blue-600">₹{item.totalAmount.toFixed(2)}</strong></div>
                        </div>
                      </div>

                      {/* Transaction details */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-3">TRANSACTION DETAILS</p>
                        <div className="space-y-2.5">
                          <div className="flex justify-between"><span className="text-slate-500">Cash Received</span><strong className="text-slate-800">₹{item.cashReceived.toFixed(2)}</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">GPay/UPI</span><strong className="text-slate-800">₹{item.gpayAmount.toFixed(2)}</strong></div>
                          <div className="flex justify-between"><span className="text-slate-500">Pending / Credit</span><strong className={item.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}>₹{item.pendingAmount.toFixed(2)}</strong></div>
                          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                            <span className="font-bold text-slate-700">Payment Status</span>
                            {Number(item.pendingAmount) > 0 || String(item.status).toLowerCase() === 'credit' ? (
                              <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-black text-rose-700">CREDIT</span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black text-emerald-700">PAID</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}