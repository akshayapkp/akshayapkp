"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Search, Download, Briefcase, ChevronDown, ChevronUp, 
  Pencil, Trash2, RefreshCw
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

export default function BilledServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<BilledServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [todayDateKey, setTodayDateKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentStaff, setCurrentStaff] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [staffList, setStaffList] = useState<string[]>([]);

  // Keep the page automatically on today's local date, including across midnight.
  useEffect(() => {
    const updateToday = () => {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setTodayDateKey(key);
    };

    updateToday();
    const interval = window.setInterval(updateToday, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // localStorage-ൽ നിന്ന് ലൈവ് ഡാറ്റ വായിക്കുന്നു
  const loadBilledData = async () => {
    if (typeof window === 'undefined') return;

    try {
      await refreshBilledServicesFromCentral();
      // serviceEntries is the source for actual billed/credit entries.
      // savedBillsList is used only to identify a bill that is still a draft.
      const serviceEntries = JSON.parse(localStorage.getItem('serviceEntries') || '[]');
      const savedBillsList = JSON.parse(localStorage.getItem('savedBillsList') || '[]');

      const savedBillsById = new Map<string, any>();
      if (Array.isArray(savedBillsList)) {
        savedBillsList.forEach((bill: any) => {
          const key = String(bill.billId || bill.id || '').trim();
          if (key) savedBillsById.set(key, bill);
        });
      }

      if (!Array.isArray(serviceEntries)) {
        setServices([]);
        return;
      }

      const billedEntries = serviceEntries.filter((item: any) => {
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

      // Do not sort by browser-parsed locale dates here. serviceEntries is
      // intentionally stored newest-first, so grouping already gives the
      // correct Billed Services order and avoids date-format reversals.
      setServices(formattedEntries);
    } catch (e) {
      console.error('Error loading billed services', e);
      setServices([]);
    }
  };

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

  const getBillDateKey = (value: unknown): string => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnly) {
      return `${isoDateOnly[1]}-${isoDateOnly[2]}-${isoDateOnly[3]}`;
    }

    const indianDate = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
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
    const billStaff = String(s.staffName || '').trim().toLowerCase();
    const selectedStaffName = String(effectiveStaffFilter || '').trim().toLowerCase();

    const matchesStaff =
      selectedStaffName === 'all'
        ? true
        : billStaff === selectedStaffName;

    if (!matchesStaff) return false;

    const storedDate = s.dateTime || s.createdAt || '';
    const billDateKey = getBillDateKey(storedDate);

    // Billed Services always shows today's bills only.
    if (billDateKey !== todayDateKey) return false;

    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

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

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="hidden md:grid grid-cols-12 bg-slate-50/80 border-b border-slate-200 py-3 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2">DATE / TIME</div>
          <div className="col-span-2">CUSTOMER</div>
          <div className="col-span-2">SERVICES</div>
          <div className="col-span-1">STAFF</div>
          <div className="col-span-1 text-right">TOTAL</div>
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

              return (
                <div key={item.id} className="transition">
                  <div className="grid grid-cols-1 md:grid-cols-12 items-center py-4 px-6 text-xs text-slate-700 gap-2 md:gap-0">
                    <div className="col-span-2 text-slate-500 font-medium">{item.dateTime}</div>
                    <div className="col-span-2">
                      <p className="font-bold text-slate-800">{item.customerName}</p>
                      <p className="text-[11px] text-slate-400">📞 {item.customerPhone}</p>
                    </div>
                    <div className="col-span-2 font-medium text-slate-700">
                      {item.quantity}x {item.serviceName}
                      {Number(item.serviceCount || 1) > 1 && (
                        <span className="ml-1 text-[10px] font-bold text-slate-400">
                          +{Number(item.serviceCount) - 1} more
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span
                        className="inline-flex max-w-full truncate rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"
                        title={item.staffName || 'Not Assigned'}
                      >
                        {item.staffName || 'Not Assigned'}
                      </span>
                    </div>
                    <div className="col-span-1 text-right font-bold text-slate-800">₹{item.totalAmount.toFixed(2)}</div>
                    <div className="col-span-1 text-right font-bold text-emerald-600">₹{item.receivedAmount.toFixed(2)}</div>
                    <div className="col-span-1 text-center">
                      {Number(item.pendingAmount) > 0 || String(item.status).toLowerCase() === 'credit' ? (
                        <span className="inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-1 rounded-full border border-rose-200 whitespace-nowrap">
                          CREDIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 whitespace-nowrap">
                          PAID
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1 text-[11px]">
                        {isExpanded ? <>Hide <ChevronUp size={12} /></> : <>View <ChevronDown size={12} /></>}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        title={isAdmin ? "Edit (Admin)" : canModifyService(item) ? "Edit (available for 5 minutes)" : "Edit time expired - Admin only"}
                        className={`p-1.5 rounded-lg transition ${
                          isAdmin || canModifyService(item)
                            ? "text-blue-500 hover:bg-blue-50"
                            : "text-slate-300 cursor-not-allowed"
                        }`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title={isAdmin ? "Delete (Admin)" : canModifyService(item) ? "Delete (available for 5 minutes)" : "Delete time expired - Admin only"}
                        className={`p-1.5 rounded-lg transition ${
                          isAdmin || canModifyService(item)
                            ? "text-rose-500 hover:bg-rose-50"
                            : "text-slate-300 cursor-not-allowed"
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-b border-slate-100 p-5 mx-4 my-2 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-2 border-r-0 md:border-r border-slate-200 pr-0 md:pr-6">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">TRANSACTION DETAILS</p>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">Cash Received:</span>
                          <span className="font-bold text-slate-800">₹{item.cashReceived.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">GPay/UPI:</span>
                          <span className="font-bold text-slate-800">₹{item.gpayAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                          <span className="text-slate-500">Pending / Credit:</span>
                          <span className={`font-black ${item.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{item.pendingAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SERVICE DESCRIPTION</p>
                        <div className="space-y-2">
                          {(Array.isArray(item.originalData) ? item.originalData : []).map((entry: any, serviceIndex: number) => (
                            <div key={`${item.id}-service-${serviceIndex}`} className="bg-slate-100/70 rounded-lg p-3 text-slate-700 font-medium flex items-center justify-between gap-3">
                              <span>{Number(entry.quantity) || 1}x {entry.serviceName || entry.service || 'Service'}</span>
                              <span className="text-slate-500 whitespace-nowrap">₹{Number(entry.totalAmount || entry.total || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-6 text-slate-500 text-[11px] pt-1">
                          <span>Staff: <strong className="text-slate-700">{item.staffName}</strong></span>
                          <span>Services: <strong className="text-slate-700">{item.serviceCount || 1}</strong></span>
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