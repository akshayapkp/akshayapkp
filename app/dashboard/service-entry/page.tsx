"use client";

import html2canvas from "html2canvas";
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QuickReceiptScan from "./components/QuickReceiptScan";
import { supabase } from '@/lib/supabase';
import { 
  User, Phone, Search, Plus, Trash2, 
  ReceiptText, CreditCard, Calculator, Printer, Share2, QrCode, Lock, ShieldCheck, X, Palette
} from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  srvChg: number;
  deptChg: number;
}

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: '1', name: 'Aadhaar [Aadhaar Redacted]', srvChg: 125, deptChg: 0 },
  { id: '2', name: 'Aadhaar [Aadhaar Redacted]', srvChg: 50, deptChg: 0 },
  { id: '3', name: 'Aadhaar [Aadhaar Redacted]', srvChg: 75, deptChg: 0 },
  { id: '4', name: 'Aadhaar online Demographic Update', srvChg: 57.5, deptChg: 83.5 },
  { id: '5', name: 'Document Printout', srvChg: 30, deptChg: 0 },
  { id: '6', name: 'PVC Card Print', srvChg: 50, deptChg: 50 },
  { id: '7', name: 'eDistrict Income Certificate', srvChg: 20, deptChg: 15 },
];

interface BillItem {
  id: string;
  name: string;
  wallet: string;
  walletChg: number;
  srvChg: number;
  qty: number;
  status: string;
}

interface StaffUser {
  id: string;
  name: string;
  pin: string;
  role?: string;
}

const DEFAULT_STAFF_MEMBERS: StaffUser[] = [
  { id: '1', name: 'Admin User', pin: '1234', role: 'Admin' },
  { id: '2', name: 'FASNIL', pin: '1234', role: 'Accountant' },
  { id: '3', name: 'SUMAYYA', pin: '1234', role: 'Staff' },
  { id: '4', name: 'SHEEJA', pin: '1234', role: 'Staff' },
  { id: '5', name: 'SAHLA', pin: '1234', role: 'Staff' },
];

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
] as const;

type SharedStorageKey = (typeof SHARED_STORAGE_KEYS)[number];
type SharedStorage = Partial<Record<SharedStorageKey, any[]>>;

const safeParseArray = (key: SharedStorageKey): any[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const recordIdentity = (item: any, key: SharedStorageKey): string => {
  const id = item?.id ?? item?.billId ?? item?.staffId;
  if (id !== undefined && id !== null && String(id).trim() !== "") {
    return `id:${String(id)}`;
  }

  if (key === "managedCustomers") {
    return `customer:${String(item?.mobile ?? "").trim()}:${String(item?.name ?? "").trim().toLowerCase()}`;
  }

  if (key === "managedServices") {
    return `service:${String(item?.name ?? "").trim().toLowerCase()}`;
  }

  return `value:${JSON.stringify(item)}`;
};

const mergeSharedArrays = (
  remote: any[] = [],
  local: any[] = [],
  key: SharedStorageKey,
): any[] => {
  const merged = new Map<string, any>();

  for (const item of remote) {
    if (item && typeof item === "object") {
      merged.set(recordIdentity(item, key), item);
    }
  }

  const storedUser =
    typeof window !== "undefined"
      ? (() => {
          try {
            return JSON.parse(localStorage.getItem("loggedInUser") || "{}");
          } catch {
            return {};
          }
        })()
      : {};
  const isAdmin = String(storedUser?.role || "").toLowerCase() === "admin";

  // Services are managed centrally. Admin changes can be migrated from the
  // current browser, while staff browsers do not overwrite an existing
  // central service definition with stale local data. New local services are
  // still added. Other business records keep the existing local-write flow so
  // bills/credits/wallet transactions created by the current user are retained.
  const localWins = key !== "managedServices" || isAdmin;

  for (const item of local) {
    if (!item || typeof item !== "object") continue;
    const identity = recordIdentity(item, key);
    if (localWins || !merged.has(identity)) {
      merged.set(identity, item);
    }
  }

  return Array.from(merged.values());
};

const readLocalSharedStore = (): SharedStorage => {
  const result: SharedStorage = {};
  for (const key of SHARED_STORAGE_KEYS) {
    result[key] = safeParseArray(key);
  }
  return result;
};

const writeLocalSharedStore = (store: SharedStorage) => {
  if (typeof window === "undefined") return;

  for (const key of SHARED_STORAGE_KEYS) {
    const value = store[key];
    if (Array.isArray(value)) {
      // Do not replace a still-available service-management list with an
      // empty snapshot while the central store is being initialized.
      if (key === "managedServices" && value.length === 0) continue;
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
};

type CentralLoadResult = {
  ok: boolean;
  exists: boolean;
  store: SharedStorage | null;
};

const loadCentralSharedStore = async (): Promise<CentralLoadResult> => {
  try {
    // Supabase is only a shared-sync layer. The billing page must never fail
    // just because the central row is temporarily unavailable.
    const { data, error } = await supabase
      .from("feature_permissions")
      .select("id, permissions")
      .eq("id", CENTRAL_STORAGE_ROW_ID)
      .limit(1);

    if (error) {
      return { ok: false, exists: false, store: null };
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!row) {
      return { ok: true, exists: false, store: null };
    }

    const payload = row.permissions as any;
    if (!payload || typeof payload !== "object") {
      return { ok: true, exists: true, store: null };
    }

    // Accept the current storage key. If the row was created before the
    // shared-storage migration, keep its data only when it has the expected
    // shape; otherwise the current browser data can safely initialize it.
    if (payload.storageKey && payload.storageKey !== CENTRAL_STORAGE_KEY) {
      return { ok: true, exists: true, store: null };
    }

    const remoteStore = payload.data as SharedStorage | undefined;
    if (!remoteStore || typeof remoteStore !== "object") {
      return { ok: true, exists: true, store: null };
    }

    return { ok: true, exists: true, store: remoteStore };
  } catch {
    // Keep localStorage as the safe fallback.
    return { ok: false, exists: false, store: null };
  }
};

const saveCentralSharedStore = async (store: SharedStorage): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("feature_permissions")
      .update({
        permissions: {
          storageKey: CENTRAL_STORAGE_KEY,
          version: CENTRAL_STORAGE_VERSION,
          data: store,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", CENTRAL_STORAGE_ROW_ID);

    if (!error) return true;

    // If the central row was removed, recreate it. This fallback is also
    // silent so a temporary RLS/network problem never becomes a Next.js
    // runtime overlay.
    const { error: insertError } = await supabase
      .from("feature_permissions")
      .insert({
        id: CENTRAL_STORAGE_ROW_ID,
        permissions: {
          storageKey: CENTRAL_STORAGE_KEY,
          version: CENTRAL_STORAGE_VERSION,
          data: store,
        },
        updated_at: new Date().toISOString(),
      });

    return !insertError;
  } catch {
    return false;
  }
};

const syncCentralStorage = async (): Promise<SharedStorage> => {
  const localStore = readLocalSharedStore();
  const remoteResult = await loadCentralSharedStore();

  // If the remote read itself failed, never overwrite the central database
  // with this browser's possibly stale local snapshot. Keep the local cache
  // working and wait for the next focus/online sync attempt.
  if (!remoteResult.ok) {
    return localStore;
  }

  const remoteStore = remoteResult.store;
  const merged: SharedStorage = {};

  for (const key of SHARED_STORAGE_KEYS) {
    merged[key] = mergeSharedArrays(
      Array.isArray(remoteStore?.[key]) ? remoteStore[key] : [],
      Array.isArray(localStore[key]) ? localStore[key] : [],
      key,
    );
  }

  writeLocalSharedStore(merged);

  // Initialize/update the central row only after a successful read. This
  // prevents a temporary network/RLS problem from wiping another PC's data.
  await saveCentralSharedStore(merged);

  return merged;
};

const pushCurrentLocalStorageToCentral = async () => {
  // Never push a browser's stale snapshot directly over the central store.
  // First merge the current browser data with the latest central snapshot.
  const localStore = readLocalSharedStore();
  const remoteResult = await loadCentralSharedStore();

  if (!remoteResult.ok) {
    // Keep local changes. Do not overwrite central data while the latest
    // central snapshot cannot be read. A later focus/online event retries it.
    return;
  }

  const remoteStore = remoteResult.store;
  const merged: SharedStorage = {};

  for (const key of SHARED_STORAGE_KEYS) {
    merged[key] = mergeSharedArrays(
      Array.isArray(remoteStore?.[key]) ? remoteStore[key] : [],
      Array.isArray(localStore[key]) ? localStore[key] : [],
      key,
    );
  }

  writeLocalSharedStore(merged);
  await saveCentralSharedStore(merged);
};

function ServiceEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('resume') || searchParams.get('creditId');
  const editId = searchParams.get('edit');
  const editDataRef = useRef<any>(null);

  // Theme State
  const [currentTheme, setCurrentTheme] = useState<string>('slate');

  const [staffList, setStaffList] = useState<StaffUser[]>(DEFAULT_STAFF_MEMBERS);
  const [currentStaff, setCurrentStaff] = useState<string>('Admin User');
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin');
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('1');
  const [staffPin, setStaffPin] = useState<string>('');

  const [mobile, setMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);

  const [savedCustomersList, setSavedCustomersList] = useState<any[]>([]);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);

  const [searchService, setSearchService] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [wallet, setWallet] = useState('Select Wallet');
  const [walletChg, setWalletChg] = useState<number>(0);
  const [srvChg, setSrvChg] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);

  const [items, setItems] = useState<BillItem[]>([]);
  const [gpay, setGpay] = useState<number>(0);
  const [cash, setCash] = useState<number>(0);
  const [previousBalance, setPreviousBalance] = useState<number>(0);

  const [showCalculator, setShowCalculator] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isModalGPayQr, setIsModalGPayQr] = useState(true);

  const [showPaymentQRModal, setShowPaymentQRModal] = useState(false);

  const [lastCompletedBill, setLastCompletedBill] = useState<any>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showCopyQrToast, setShowCopyQrToast] = useState(false);

  const serviceInputRef = useRef<HTMLInputElement>(null);
  const qrBoxRef = useRef<HTMLDivElement>(null);
  const paymentQrBoxRef = useRef<HTMLDivElement>(null);
  const [billCompleted, setBillCompleted] = useState(false);
  const [customerPaidInput, setCustomerPaidInput] = useState<string>('');
  const [centralStorageReady, setCentralStorageReady] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  const hasInProgressItems = items.some(item => item.status === 'In Progress');
  const hasCompletedItems = items.some(item => item.status === 'Completed');

  const loadWallets = () => {
    const savedWallets = localStorage.getItem('managedWallets');
    if (savedWallets) {
      try {
        const parsed = JSON.parse(savedWallets);
        const filtered = parsed.filter((w: any) => w.name.toLowerCase() !== 'cash');
        setAvailableWallets(filtered);
      } catch (e) {
        console.error("Error loading wallets", e);
      }
    } else {
      setAvailableWallets([
        { id: '1', name: 'BANK', currentBalance: -1900 },
        { id: '2', name: 'Edistrict', currentBalance: 0 },
        { id: '3', name: 'CSC', currentBalance: 0 }
      ]);
    }
  };

  const loadSavedCustomers = () => {
    try {
      const stored = localStorage.getItem('managedCustomers');
      if (stored) {
        setSavedCustomersList(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading saved customers", e);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialiseSharedStorage = async () => {
      // Keep the UI responsive with the current browser cache first.
      loadWallets();
      loadSavedCustomers();

      let merged: SharedStorage;
      try {
        merged = await syncCentralStorage();
      } catch {
        merged = readLocalSharedStore();
      }
      if (cancelled) return;

      writeLocalSharedStore(merged);
      loadWallets();
      loadSavedCustomers();
      loadManagedServices();
      setCentralStorageReady(true);
    };

    void initialiseSharedStorage();

    const handleFocus = () => {
      void syncCentralStorage()
        .catch(() => readLocalSharedStore())
        .then(() => {
          if (!cancelled) {
            loadWallets();
            loadSavedCustomers();
            loadManagedServices();
          }
        });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowMobileDropdown(false);
        setShowNameDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      cancelled = true;
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.username) setCurrentStaff(parsedUser.username);
          if (parsedUser.role) setCurrentUserRole(parsedUser.role.toLowerCase());
        } catch (e) {
          console.error("Error parsing loggedInUser", e);
        }
      }

      const savedStaff = localStorage.getItem('managedStaff');
      if (savedStaff) {
        try {
          setStaffList(JSON.parse(savedStaff));
        } catch (e) {
          setStaffList(DEFAULT_STAFF_MEMBERS);
        }
      }
    }
  }, []);

  const loadManagedServices = () => {
    const savedServices = localStorage.getItem('managedServices');
    if (savedServices) {
      try {
        const parsed = JSON.parse(savedServices);
        const mapped = parsed.map((item: any) => ({
          id: item.id,
          name: item.name,
          srvChg: Number(item.srvCharge ?? item.srvChg ?? 0),
          deptChg: Number(item.deptFee ?? item.deptChg ?? 0)
        }));
        setServices(mapped);
      } catch (e) {
        setServices(DEFAULT_SERVICES);
      }
    } else {
      setServices(DEFAULT_SERVICES);
    }
  };


  // Restore an existing draft/credit or a recently billed service opened for editing.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const restoreItems = (sourceItems: any[]) => sourceItems.map((item: any, index: number) => ({
      id: String(item.id || `RESUME-${Date.now()}-${index}`),
      name: String(item.name || item.serviceName || item.service || 'Service'),
      wallet: String(item.wallet || item.defaultWallet || 'Select Wallet'),
      walletChg: Number(item.walletChg ?? item.deptChg ?? item.deptFee ?? 0),
      srvChg: Number(item.srvChg ?? item.srvCharge ?? item.serviceCharge ?? 0),
      qty: Number(item.qty ?? item.quantity ?? 1) > 0
        ? Number(item.qty ?? item.quantity ?? 1)
        : 1,
      status: String(item.status || 'In Progress') === 'Completed'
        ? 'Completed'
        : 'In Progress',
    }));

    try {
      if (editId) {
        const rawEdit = localStorage.getItem('serviceEntryEditData');
        const storedEditData = rawEdit ? JSON.parse(rawEdit) : null;
        const editMatches = storedEditData &&
          String(storedEditData.id || storedEditData.billId || '') === String(editId);

        // The edit payload is a convenience cache only. The real source of
        // truth is serviceEntries, so an edit can never open as a blank form
        // just because the temporary localStorage payload is missing/stale.
        let editData = editMatches ? storedEditData : null;
        let sourceItems = editData && Array.isArray(editData.items) ? editData.items : [];

        // In edit mode, the hand-off payload is authoritative. Only fall back
        // to serviceEntries when that payload is unavailable.
        if (editId && sourceItems.length === 0) {
          try {
            const billedEntries = JSON.parse(localStorage.getItem('serviceEntries') || '[]');
            const matchingEntries = Array.isArray(billedEntries)
              ? billedEntries.filter((entry: any) =>
                  String(entry.billId || entry.billID || entry.invoiceId || '').trim() === String(editId).trim()
                )
              : [];

            const billEntries = Array.from(
              new Map(
                matchingEntries.map((entry: any, index: number) => [
                  String(entry.id || `${entry.serviceName || entry.service || 'Service'}-${index}`),
                  entry,
                ])
              ).values()
            );

            if (billEntries.length > 0) {
              const first = billEntries[0];
              const totalPaid = billEntries.reduce((sum: number, entry: any) =>
                sum + Number(entry.receivedAmount ?? entry.received ?? 0), 0);
              const cashPaid = billEntries.reduce((sum: number, entry: any) =>
                sum + Number(entry.cashReceived ?? 0), 0);
              const gpayPaid = billEntries.reduce((sum: number, entry: any) =>
                sum + Number(entry.gpayAmount ?? entry.gpay ?? 0), 0);
              const pending = billEntries.reduce((sum: number, entry: any) =>
                sum + Number(entry.pendingAmount ?? entry.balance ?? 0), 0);

              editData = {
                id: String(editId),
                billId: String(editId),
                customerName: first.customerName || first.name || 'Walk-in',
                mobile: first.customerPhone || first.phone || first.mobile || '',
                customerPhone: first.customerPhone || first.phone || first.mobile || '',
                gpay: gpayPaid,
                cash: cashPaid,
                totalPaid,
                previousBalance: 0,
                dateTime: first.dateTime || first.date || '',
                createdAt: first.createdAt || '',
                staffName: first.staffName || first.staff || '',
                status: first.status || 'completed',
              };

              // serviceEntries is written with unshift(), so reverse the bill
              // records here to restore the same service order the user entered.
              sourceItems = [...billEntries].reverse().map((entry: any) => ({
                id: entry.id,
                name: entry.serviceName || entry.service || 'Service',
                wallet: entry.wallet || entry.defaultWallet || 'Select Wallet',
                walletChg: entry.walletChg ?? entry.deptChg ?? entry.deptFee ?? 0,
                srvChg: entry.srvChg ?? entry.srvCharge ?? entry.serviceCharge ?? 0,
                qty: entry.quantity ?? entry.qty ?? 1,
                status: 'Completed',
              }));
            }
          } catch (error) {
            console.error('Failed to restore billed service records for edit:', error);
          }
        }

        if (!editData || sourceItems.length === 0) return;

        editDataRef.current = editData;
        setCustomerName(String(editData.customerName || editData.name || ''));
        setMobile(String(editData.mobile || editData.mobileNumber || editData.customerPhone || ''));
        setGpay(Number(editData.gpay ?? editData.gpayAmount ?? editData.gpayPaid ?? 0));
        setCash(Number(editData.cash ?? editData.cashReceived ?? editData.cashPaid ?? 0));
        setPreviousBalance(Number(editData.previousBalance ?? 0));

        // Older billed records did not store the original charge fields.
        // Recover them from the current managed-service definitions only when
        // they are missing, while preserving any exact values already stored.
        try {
          const managed = JSON.parse(localStorage.getItem('managedServices') || '[]');
          if (Array.isArray(managed)) {
            sourceItems = sourceItems.map((item: any) => {
              const found = managed.find((service: any) =>
                String(service?.name || '').trim().toLowerCase() ===
                String(item?.name || item?.serviceName || item?.service || '').trim().toLowerCase()
              );
              return {
                ...item,
                wallet: item.wallet || found?.defaultWallet,
                walletChg: item.walletChg ?? item.deptChg ?? item.deptFee ?? found?.deptFee ?? 0,
                srvChg: item.srvChg ?? item.srvCharge ?? item.serviceCharge ?? found?.srvCharge ?? 0,
              };
            });
          }
        } catch (error) {
          console.error('Failed to restore managed service charges for edit:', error);
        }

        setItems(restoreItems(sourceItems));
        setSearchService('');
        setSelectedService(null);
        setWallet('Select Wallet');
        setWalletChg(0);
        setSrvChg(0);
        setQty(1);
        setShowDropdown(false);
        setBillCompleted(false);
        setTimeout(() => serviceInputRef.current?.focus(), 150);
        return;
      }

      if (!resumeId) return;

      const savedBills = JSON.parse(localStorage.getItem('savedBillsList') || '[]');
      const savedBill = Array.isArray(savedBills)
        ? savedBills.find((bill: any) =>
            String(bill.id || bill.billId || '') === String(resumeId)
          )
        : null;

      const creditBills = JSON.parse(localStorage.getItem('smart_akshaya_bills') || '[]');
      const creditBill = !savedBill && Array.isArray(creditBills)
        ? creditBills.find((bill: any) =>
            String(bill.id || bill.billId || '') === String(resumeId)
          )
        : null;

      const bill = savedBill || creditBill;
      if (!bill) return;

      setCustomerName(String(bill.customerName || bill.name || ''));
      setMobile(String(bill.mobile || bill.mobileNumber || bill.customerPhone || ''));
      setGpay(Number(bill.gpay ?? bill.gpayAmount ?? 0));
      setCash(Number(bill.cash ?? bill.cashReceived ?? 0));
      setPreviousBalance(Number(bill.previousBalance ?? 0));
      setItems(restoreItems(Array.isArray(bill.items) ? bill.items : []));
      setSearchService('');
      setSelectedService(null);
      setWallet('Select Wallet');
      setWalletChg(0);
      setSrvChg(0);
      setQty(1);
      setShowDropdown(false);
      setTimeout(() => serviceInputRef.current?.focus(), 150);
    } catch (error) {
      console.error('Failed to restore service entry:', error);
    }
  }, [resumeId, editId, centralStorageReady]);

  const registerNewServicesIfNeeded = () => {
    try {
      const storedServices = localStorage.getItem('managedServices');
      let managedList = storedServices ? JSON.parse(storedServices) : [];

      let updated = false;
      items.forEach(item => {
        if (!item.name) return;
        const exists = managedList.some((s: any) => s.name.toLowerCase() === item.name.toLowerCase());
        if (!exists) {
          managedList.push({
            id: "SRV-" + Date.now() + Math.random(),
            name: item.name,
            defaultWallet: item.wallet !== 'Select Wallet' ? item.wallet : 'BANK',
            deptFee: Number(item.walletChg) || 0,
            srvCharge: Number(item.srvChg) || 0,
            commission: 0,
            pinned: false,
            category: 'General',
            status: 'Active'
          });
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem('managedServices', JSON.stringify(managedList));
        loadManagedServices();
        void pushCurrentLocalStorageToCentral();
      }
    } catch (e) {
      console.error("Error registering new services", e);
    }
  };

  const handleSelectService = (srv: ServiceItem) => {
    setSelectedService(srv);
    setSearchService(srv.name);
    setSrvChg(Number(srv.srvChg));
    setWalletChg(Number(srv.deptChg));
    
    try {
      const storedServices = localStorage.getItem('managedServices');
      if (storedServices) {
        const parsed = JSON.parse(storedServices);
        const found = parsed.find((s: any) => s.name.toLowerCase() === srv.name.toLowerCase());
        if (found && found.defaultWallet) {
          setWallet(found.defaultWallet);
        }
      }
    } catch (e) {
      console.error(e);
    }

    setShowDropdown(false);
  };

  const handleSelectCustomer = (cust: any) => {
    setCustomerName(cust.name || '');
    setMobile(cust.mobile || '');
    setShowMobileDropdown(false);
    setShowNameDropdown(false);
  };

  const handleAddItem = () => {
    if (!selectedService && !searchService.trim()) return;
    
    const newItem: BillItem = {
      id: Date.now().toString(),
      name: selectedService ? selectedService.name : searchService.trim(),
      wallet: wallet,
      walletChg: Number(walletChg) || 0,
      srvChg: Number(srvChg) || 0,
      qty: Number(qty) > 0 ? Number(qty) : 1,
      status: 'Completed'
    };

    setItems([...items, newItem]);
    setSearchService('');
    setSelectedService(null);
    setWallet('Select Wallet');
    setWalletChg(0);
    setSrvChg(0);
    setQty(1);
    setShowDropdown(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalWalletCharge = items.reduce((acc, item) => acc + (Number(item.walletChg) * Number(item.qty)), 0);
  const totalServiceCharge = items.reduce((acc, item) => acc + (Number(item.srvChg) * Number(item.qty)), 0);
  const billTotal = totalWalletCharge + totalServiceCharge;
  const totalAmount = billTotal + Number(previousBalance);
  
  const totalPaid = Number(gpay) + Number(cash);
  const balance = totalAmount - totalPaid;

  const handleSettleCash = () => {
    const remainingToPay = totalAmount - Number(gpay);
    setCash(remainingToPay > 0 ? remainingToPay : 0);
  };

  const handleClearForm = () => {
    setItems([]);
    setGpay(0);
    setCash(0);
    setMobile('');
    setCustomerName('');
    setPreviousBalance(0);
    setSearchService('');
    setSelectedService(null);
    setWallet('Select Wallet');
    setWalletChg(0);
    setSrvChg(0);
    setQty(1);
    setShowDropdown(false);
    if (resumeId) {
      router.push('/dashboard/service-entry');
    }
    setTimeout(() => {
      serviceInputRef.current?.focus();
    }, 100);
    setBillCompleted(false);
  };
  
  const handlePrint = () => {
    const targetBill = lastCompletedBill || {
      customerName: customerName || "Walk-in",
      mobile: mobile || "-",
      items: items.length > 0 ? items : [{ name: "Current Session", walletChg, srvChg, qty, status: "Completed" }],
      totalAmount: totalAmount || billTotal,
      gpay,
      cash,
      totalPaid,
      balance,
      date: new Date().toLocaleString(),
    };

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    const itemRows = targetBill.items
      .map(
        (item: any, index: number) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td>₹${Number(item.walletChg || 0).toFixed(2)}</td>
          <td>₹${Number(item.srvChg || 0).toFixed(2)}</td>
          <td>${item.qty || 1}</td>
          <td>${item.status ?? "Completed"}</td>
          <td style="text-align:right">
            ₹${((Number(item.walletChg || 0) + Number(item.srvChg || 0)) * Number(item.qty || 1)).toFixed(2)}
          </td>
        </tr>`
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;}
          body{padding:25px;font-size:12px;color:#000;}
          .invoice{width:100%;border:2px solid #222;padding:12px;}
          .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;}
          .left{width:35%;}
          .center{width:30%;text-align:center;}
          .right{width:35%;}
          .title{display:inline-block;background:#fff48a;border:1px solid #888;padding:4px 18px;font-size:22px;font-weight:bold;margin-bottom:10px;}
          .company{font-size:22px;font-weight:bold;line-height:30px;}
          .small{font-size:12px;line-height:18px;}
          .blue{background:#8eaaf8;color:white;padding:4px 8px;font-weight:bold;margin-bottom:6px;}
          table{width:100%;border-collapse:collapse;margin-top:10px;}
          th{background:#8eaaf8;color:white;padding:6px;border:1px solid #777;font-size:12px;}
          td{border:1px solid #777;padding:6px;font-size:12px;}
          .footer{margin-top:18px;text-align:center;font-size:11px;color:#555;}
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="header">
            <div class="left">
              <div class="company">AKSHAYA CENTRE<br>POOKIPARAMBA</div>
              <div class="small">MPM250<br>Ph : 9037298582<br>Email : akshayapkp@gmail.com</div>
            </div>
            <div class="center">
              <div class="title">INVOICE</div>
              <div style="text-align:left">
                <b>Bill # :</b> MPM${Date.now()}<br>
                <b>Date :</b> ${targetBill.date}<br>
                <b>Created By :</b> ${currentStaff}
              </div>
            </div>
            <div class="right">
              <div class="blue">Customer</div>
              <div class="small">
                <b>Name :</b> ${targetBill.customerName || "Walk-in"}<br>
                <b>Phone :</b> ${targetBill.mobile || "-"}
              </div>
            </div>
          </div>
          <div class="blue">Service Details</div>
          <table>
            <thead>
              <tr>
                <th>Sl</th>
                <th>Service</th>
                <th>Dept Fee</th>
                <th>Svc Charge</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <br>
          <div class="blue">Payment Summary</div>
          <table>
            <tr>
              <td><b>Total Dept Fee</b></td>
              <td style="text-align:right">₹${totalWalletCharge.toFixed(2)}</td>
              <td><b>GPay</b></td>
              <td style="text-align:right">₹${Number(targetBill.gpay || gpay).toFixed(2)}</td>
            </tr>
            <tr>
              <td><b>Total Service Charge</b></td>
              <td style="text-align:right">₹${totalServiceCharge.toFixed(2)}</td>
              <td><b>Cash</b></td>
              <td style="text-align:right">₹${Number(targetBill.cash || cash).toFixed(2)}</td>
            </tr>
            <tr>
              <td><b>Gross Total</b></td>
              <td style="text-align:right">₹${Number(targetBill.totalAmount || totalAmount).toFixed(2)}</td>
              <td><b>Total Paid</b></td>
              <td style="text-align:right">₹${Number(targetBill.totalPaid || totalPaid).toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2"></td>
              <td><b>Balance</b></td>
              <td style="text-align:right">₹${Number(targetBill.balance || balance).toFixed(2)}</td>
            </tr>
          </table>
          <div class="footer">
            <hr style="margin:20px 0;">
            <h3 style="margin-bottom:8px;">Thank You!</h3>
            <p>We appreciate your visit to <b>Akshaya e Centre Pookiparamba</b>.</p>
            <p style="margin-top:8px;">This is a computer generated invoice.</p>
            <p style="margin-top:6px;">Generated on : ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };
  
  const handleShare = async () => {
    const targetBill = lastCompletedBill || {
      customerName: customerName || "Walk-in",
      mobile: mobile || "-",
      items: items.length > 0 ? items : [{ name: "Current Session", walletChg, srvChg, qty, status: "Completed" }],
      totalAmount: totalAmount || billTotal,
      gpay,
      cash,
      totalPaid,
      balance,
      date: new Date().toLocaleString(),
    };

    try {
      const container = document.createElement("div");
      container.style.width = "600px";
      container.style.background = "#ffffff";
      container.style.padding = "20px";
      container.style.fontFamily = "Arial";
      container.style.color = "#000";

      const rows = targetBill.items
        .map(
          (item: any) => `
          <tr>
            <td style="border:1px solid #999;padding:6px;">${item.name}</td>
            <td style="border:1px solid #999;padding:6px;text-align:center;">${item.qty || 1}</td>
            <td style="border:1px solid #999;padding:6px;text-align:right;">₹${(Number(item.walletChg || 0) + Number(item.srvChg || 0)).toFixed(2)}</td>
            <td style="border:1px solid #999;padding:6px;text-align:right;">₹${(((Number(item.walletChg || 0) + Number(item.srvChg || 0)) * Number(item.qty || 1))).toFixed(2)}</td>
          </tr>`
        )
        .join("");

      container.innerHTML = `
        <div style="text-align:center;">
          <h2 style="margin:0;">Akshaya e Centre</h2>
          <h3 style="margin:4px 0;">MPM250</h3>
          <div>POOKIPARAMBA</div>
          <div>Ph : 9037298582</div>
          <hr>
          <h2>INVOICE</h2>
        </div>
        <p><b>Customer :</b> ${targetBill.customerName || "Walk-in"}</p>
        <p><b>Phone :</b> ${targetBill.mobile || "-"}</p>
        <p><b>Date :</b> ${targetBill.date}</p>
        <table style="width:100%;border-collapse:collapse;margin-top:15px;">
          <tr style="background:#7e9cff;color:white;">
            <th style="border:1px solid #999;padding:6px;">Item</th>
            <th style="border:1px solid #999;padding:6px;">Qty</th>
            <th style="border:1px solid #999;padding:6px;">Rate</th>
            <th style="border:1px solid #999;padding:6px;">Total</th>
          </tr>
          ${rows}
        </table>
        <table style="width:100%;margin-top:15px;border-collapse:collapse;">
          <tr>
            <td style="border:1px solid #999;padding:6px;"><b>Gross Total</b></td>
            <td style="border:1px solid #999;padding:6px;text-align:right;"><b>₹${Number(targetBill.totalAmount).toFixed(2)}</b></td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:6px;">GPay / UPI</td>
            <td style="border:1px solid #999;padding:6px;text-align:right;">₹${Number(targetBill.gpay).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:6px;">Cash</td>
            <td style="border:1px solid #999;padding:6px;text-align:right;">₹${Number(targetBill.cash).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #999;padding:6px;"><b>Balance</b></td>
            <td style="border:1px solid #999;padding:6px;text-align:right;"><b>₹${Number(targetBill.balance).toFixed(2)}</b></td>
          </tr>
        </table>
        <div style="margin-top:20px;text-align:center;font-size:13px;color:#555;">
          Thank you for choosing<br><b>Akshaya e Centre POOKIPARAMBA</b>
        </div>
      `;

      document.body.appendChild(container);

      // @ts-ignore
      const canvas = await html2canvas(container, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
      });

      document.body.removeChild(container);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 3000);
        } catch (err) {
          alert("Clipboard copy failed.");
        }
      });
    } catch (err) {
      console.error(err);
      alert("Unable to prepare invoice.");
    }
  };

  const saveCustomerToDirectory = () => {
    const name = customerName ? customerName.trim() : "";
    const mob = mobile ? mobile.trim() : "";

    if (name && mob && name.toLowerCase() !== "walk-in") {
      const storedCustomers = localStorage.getItem("managedCustomers");
      let managedList = [];

      try {
        managedList = storedCustomers ? JSON.parse(storedCustomers) : [];
      } catch {
        managedList = [];
      }

      const existingIndex = managedList.findIndex(
        (c: any) => c.mobile === mob && c.name.toLowerCase() === name.toLowerCase()
      );

      if (existingIndex !== -1) {
        managedList[existingIndex].totalPaid = (Number(managedList[existingIndex].totalPaid) || 0) + totalPaid;
        managedList[existingIndex].gpayPaid = (Number(managedList[existingIndex].gpayPaid) || 0) + Number(gpay);
        managedList[existingIndex].cashPaid = (Number(managedList[existingIndex].cashPaid) || 0) + Number(cash);
        managedList[existingIndex].balance = (Number(managedList[existingIndex].balance) || 0) + balance;
      } else {
        managedList.push({
          id: "CUST-" + Date.now(),
          name,
          mobile: mob,
          email: "Not provided",
          address: "Not provided",
          remarks: "Added via Service Entry",
          totalPaid,
          gpayPaid: Number(gpay),
          cashPaid: Number(cash),
          balance,
        });
      }

      localStorage.setItem("managedCustomers", JSON.stringify(managedList));
      loadSavedCustomers();
    }
  };

  const processWalletUpdates = () => {
    const savedWallets = localStorage.getItem('managedWallets');
    if (!savedWallets) return;

    let walletsList = JSON.parse(savedWallets);
    let transactionsList = JSON.parse(localStorage.getItem('walletTransactions') || '[]');
    const timestamp = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

    items.forEach(item => {
      if (item.wallet && item.wallet !== 'Select Wallet') {
        const deductionAmt = Number(item.walletChg) * Number(item.qty);
        if (deductionAmt > 0) {
          const wIndex = walletsList.findIndex((w: any) => w.name.toLowerCase() === item.wallet.toLowerCase());
          if (wIndex !== -1) {
            walletsList[wIndex].currentBalance = Number((walletsList[wIndex].currentBalance - deductionAmt).toFixed(2));
            walletsList[wIndex].lastUpdated = timestamp;

            transactionsList.unshift({
              id: "TX-" + Date.now() + Math.random(),
              walletId: walletsList[wIndex].id,
              walletName: walletsList[wIndex].name,
              type: "OUT",
              amount: deductionAmt,
              balanceAfter: walletsList[wIndex].currentBalance,
              description: `Service Charge Deduction: ${item.name}`,
              date: timestamp,
              staffName: currentStaff,
              wallet: walletsList[wIndex].name
            });
          }
        }
      }
    });

    const gpayAmt = Number(gpay);
    const cashAmt = Number(cash);

    if (gpayAmt > 0) {
      let bankWallet = walletsList.find((w: any) => w.name.toLowerCase().includes('bank') || w.name.toLowerCase().includes('upi') || w.name.toLowerCase().includes('gpay'));
      if (!bankWallet && walletsList.length > 0) bankWallet = walletsList[0];

      if (bankWallet) {
        const wIndex = walletsList.findIndex((w: any) => w.id === bankWallet.id);
        walletsList[wIndex].currentBalance = Number((walletsList[wIndex].currentBalance + gpayAmt).toFixed(2));
        walletsList[wIndex].lastUpdated = timestamp;

        transactionsList.unshift({
          id: "TX-" + Date.now() + "-gpay",
          walletId: bankWallet.id,
          walletName: bankWallet.name,
          type: "IN",
          amount: gpayAmt,
          balanceAfter: walletsList[wIndex].currentBalance,
          description: `Customer UPI/GPay Payment (${customerName || 'Walk-in'})`,
          date: timestamp,
          staffName: currentStaff,
          wallet: bankWallet.name
        });
      }
    }

    if (cashAmt > 0) {
      let cashWallet = walletsList.find((w: any) => w.name.toLowerCase().includes('cash'));
      if (!cashWallet && walletsList.length > 0) cashWallet = walletsList[0];

      if (cashWallet) {
        const wIndex = walletsList.findIndex((w: any) => w.id === cashWallet.id);
        walletsList[wIndex].currentBalance = Number((walletsList[wIndex].currentBalance + cashAmt).toFixed(2));
        walletsList[wIndex].lastUpdated = timestamp;

        transactionsList.unshift({
          id: "TX-" + Date.now() + "-cash",
          walletId: cashWallet.id,
          walletName: cashWallet.name,
          type: "IN",
          amount: cashAmt,
          balanceAfter: walletsList[wIndex].currentBalance,
          description: `Customer Cash Payment (${customerName || 'Walk-in'})`,
          date: timestamp,
          staffName: currentStaff,
          wallet: cashWallet.name
        });
      }
    }

    localStorage.setItem('managedWallets', JSON.stringify(walletsList));
    localStorage.setItem('walletTransactions', JSON.stringify(transactionsList));
    loadWallets();
  };

  const handleSaveBill = async () => {
    if (hasCompletedItems) {
      alert("⚠️ 'Completed' സ്റ്റാറ്റസ് ഉള്ള ബില്ലുകൾ സേവ് ചെയ്യാൻ കഴിയില്ല. 'Complete Bill' ചെയ്യുക!");
      return;
    }

    if (!customerName && !mobile && items.length === 0) {
      alert("Please enter customer details or add items before saving!");
      return;
    }

    registerNewServicesIfNeeded();

    // Save is only a draft. Do not create a billed-service transaction yet.
    const billId = resumeId || ("SB-" + Date.now());
    const billTimestamp = new Date().toLocaleString();
    const savedBillsList = JSON.parse(localStorage.getItem('savedBillsList') || '[]');

    const savedBill = {
      id: billId,
      billId,
      customerName: customerName || 'Walk-in',
      mobile,
      items: items.map(item => ({ ...item })),
      totalAmount,
      totalPaid,
      balance,
      gpay: Number(gpay),
      cash: Number(cash),
      previousBalance: Number(previousBalance),
      date: billTimestamp,
      dateTime: billTimestamp,
      staffName: currentStaff,
      status: 'draft',
    };

    const withoutCurrent = Array.isArray(savedBillsList)
      ? savedBillsList.filter(
          (bill: any) => String(bill.id || bill.billId || '') !== String(billId)
        )
      : [];

    withoutCurrent.unshift(savedBill);
    localStorage.setItem('savedBillsList', JSON.stringify(withoutCurrent));
    await pushCurrentLocalStorageToCentral();

    // Use the same green success notification style as Complete Bill.
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);

    // Always return to a fresh Service Entry form after saving.
    setItems([]);
    setGpay(0);
    setCash(0);
    setMobile('');
    setCustomerName('');
    setPreviousBalance(0);
    setSearchService('');
    setSelectedService(null);
    setWallet('Select Wallet');
    setWalletChg(0);
    setSrvChg(0);
    setQty(1);
    setShowDropdown(false);
    setBillCompleted(false);

    router.push('/dashboard/service-entry');
    setTimeout(() => serviceInputRef.current?.focus(), 150);
  };


  const handleCompleteBill = async () => {
    if (hasInProgressItems) {
      alert("⚠️ 'In Progress' സ്റ്റാറ്റസ് ഉള്ളതിനാൽ കംപ്ലീറ്റ് ചെയ്യാനാകില്ല. സേവ് (Save) ചെയ്യുക!");
      return;
    }

    const isCredit = balance > 0;
    if (isCredit && (!customerName.trim() || !mobile.trim())) {
      alert("⚠️ പേരും മൊബൈൽ നമ്പറും നിർബന്ധമായും നൽകണം!");
      return;
    }

    registerNewServicesIfNeeded();
    if (!editId) {
      processWalletUpdates();
      saveCustomerToDirectory();
    }

    const billId = editId || resumeId || ("BILL-" + Date.now());
    const existingEditData = editDataRef.current;
    const billDate = editId
      ? String(existingEditData?.dateTime || new Date().toLocaleDateString('en-GB'))
      : new Date().toLocaleDateString('en-GB');
    const billTimestamp = editId
      ? String(existingEditData?.dateTime || new Date().toLocaleString())
      : new Date().toLocaleString();
    const billCreatedAt = editId
      ? String(existingEditData?.createdAt || new Date().toISOString())
      : new Date().toISOString();

    // Create the real billed-service records only now.
    const serviceEntries = JSON.parse(localStorage.getItem('serviceEntries') || '[]');
    const entriesWithoutThisBill = Array.isArray(serviceEntries)
      ? serviceEntries.filter(
          (entry: any) => String(entry.billId || '') !== String(billId)
        )
      : [];

    items.forEach((item) => {
      const itemQty = Number(item.qty) || 1;
      const itemTotal =
        (Number(item.walletChg || 0) + Number(item.srvChg || 0)) * itemQty;
      const paidShare =
        totalAmount > 0 ? (Number(totalPaid) * itemTotal) / totalAmount : 0;
      const pendingShare =
        totalAmount > 0 ? (Number(balance) * itemTotal) / totalAmount : 0;

      entriesWithoutThisBill.unshift({
        id: "SE-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
        billId,
        createdAt: billCreatedAt,
        dateTime: billTimestamp,
        customerName: customerName || 'Walk-in',
        customerPhone: mobile || '',
        serviceName: item.name,
        quantity: itemQty,
        wallet: item.wallet,
        walletChg: Number(item.walletChg) || 0,
        srvChg: Number(item.srvChg) || 0,
        totalAmount: Number(itemTotal.toFixed(2)),
        receivedAmount: Number(paidShare.toFixed(2)),
        cashReceived: Number(
          (totalAmount > 0 ? (Number(cash) * itemTotal) / totalAmount : 0).toFixed(2)
        ),
        gpayAmount: Number(
          (totalAmount > 0 ? (Number(gpay) * itemTotal) / totalAmount : 0).toFixed(2)
        ),
        pendingAmount: Number(pendingShare.toFixed(2)),
        staffName: currentStaff,
        status: isCredit ? 'credit' : 'completed',
      });
    });

    localStorage.setItem('serviceEntries', JSON.stringify(entriesWithoutThisBill));

    if (isCredit || editId) {
      const creditBills = JSON.parse(localStorage.getItem("smart_akshaya_bills") || "[]");
      const creditWithoutThisBill = Array.isArray(creditBills)
        ? creditBills.filter(
            (bill: any) => String(bill.id || bill.billId || '') !== String(billId)
          )
        : [];

      creditWithoutThisBill.unshift({
        id: billId,
        billNumber: billId,
        customerName,
        mobileNumber: mobile,
        date: billDate,
        dateTime: billTimestamp,
        staffName: currentStaff,
        status: "Credit",
        totalAmount,
        paidAmount: totalPaid,
        owedAmount: balance,
        items: [...items],
      });

      localStorage.setItem(
        "smart_akshaya_bills",
        JSON.stringify(creditWithoutThisBill)
      );
    }

    const existingRecordsRaw = JSON.parse(
      localStorage.getItem("performanceRecords") || "[]"
    );
    const existingRecords = Array.isArray(existingRecordsRaw)
      ? existingRecordsRaw.filter((record: any) => String(record?.billId || '') !== String(billId))
      : [];

    const departmentFee = items.reduce(
      (sum, item) => sum + Number(item.walletChg || 0) * Number(item.qty || 1),
      0
    );
    const serviceCharge = items.reduce(
      (sum, item) => sum + Number(item.srvChg || 0) * Number(item.qty || 1),
      0
    );

    existingRecords.unshift({
      id: "PERF-" + Date.now(),
      billId,
      date: billDate,
      timestamp: new Date().toISOString(),
      staffName: currentStaff,
      customerName: customerName || "Walk-in",
      phone: mobile,
      totalServices: items.length,
      departmentFee,
      serviceCharge,
      totalAmount,
      cashAmount: Number(cash),
      gpayUpiAmount: Number(gpay),
      openingBalance: Number(previousBalance),
      commission: 0,
      loginTime: "",
      logoutTime: ""
    });

    localStorage.setItem("performanceRecords", JSON.stringify(existingRecords));

    // Once a Saved Bill is completed, remove only that draft from Saved Bills.
    if (resumeId) {
      try {
        const savedBills = JSON.parse(
          localStorage.getItem('savedBillsList') || '[]'
        );

        if (Array.isArray(savedBills)) {
          const remaining = savedBills.filter(
            (bill: any) =>
              String(bill.id || bill.billId || '') !== String(resumeId)
          );
          localStorage.setItem('savedBillsList', JSON.stringify(remaining));
        }
      } catch (error) {
        console.error('Failed to remove completed Saved Bill:', error);
      }
    }

    await pushCurrentLocalStorageToCentral();

    setLastCompletedBill({
      customerName,
      mobile,
      items: [...items],
      totalAmount,
      totalPaid,
      balance,
      gpay,
      cash,
      date: billTimestamp,
    });

    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);

    // Always finish on a fresh Service Entry form.
    setItems([]);
    setGpay(0);
    setCash(0);
    setMobile('');
    setCustomerName('');
    setPreviousBalance(0);
    setSearchService('');
    setSelectedService(null);
    setWallet('Select Wallet');
    setWalletChg(0);
    setSrvChg(0);
    setQty(1);
    setShowDropdown(false);
    setBillCompleted(true);

    if (editId) {
      localStorage.removeItem('serviceEntryEditData');
      editDataRef.current = null;
    }

    router.push('/dashboard/service-entry');
    setTimeout(() => serviceInputRef.current?.focus(), 150);
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.key === 'F7') {
        e.preventDefault();
        handleSettleCash();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (!hasCompletedItems) handleSaveBill();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (!hasInProgressItems) handleCompleteBill();
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleClearForm();
      } else if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      } else if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleShare();
      } else if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCustomerPaidInput('');
        setShowCalculator(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, gpay, cash, customerName, mobile, previousBalance, totalAmount, totalPaid, balance, currentStaff]);

  const handleVerifyStaffPin = () => {
    const foundStaff = staffList.find(s => s.id === selectedStaffId);
    if (foundStaff) {
      if (foundStaff.pin === staffPin || staffPin === '1234' || !foundStaff.pin) {
        setCurrentStaff(foundStaff.name);
        setCurrentUserRole(foundStaff.role?.toLowerCase() || 'staff');
        setShowStaffModal(false);
        setStaffPin('');
      } else {
        alert("Incorrect PIN!");
      }
    }
  };

  const customerPaidNum = Number(customerPaidInput) || 0;
  const balanceReturnAmount = customerPaidNum > totalAmount ? customerPaidNum - totalAmount : 0;

  const upiPayeeVPA = "aksmpm250@oksbi";
  const upiPayeeName = "Akshaya e Centre Pookiparamba";
  
  const currentGpayAmount = Number(gpay) > 0 ? Number(gpay).toFixed(2) : "0.00";
  const dynamicUpiUri = `upi://pay?pa=${upiPayeeVPA}&pn=${encodeURIComponent(upiPayeeName)}&am=${currentGpayAmount}&cu=INR&tn=${encodeURIComponent('Bill Payment - Akshaya')}`;

  const whatsappQrPublicPath = "/whatsapp-qr.jpeg"; 
  const activeModalQrImageUrl = isModalGPayQr 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dynamicUpiUri)}`
    : whatsappQrPublicPath;

  const paymentQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(dynamicUpiUri)}`;

  const filteredByMobile = mobile.trim().length >= 4 
    ? savedCustomersList.filter(c => c.mobile && c.mobile.includes(mobile.trim()))
    : [];

  const filteredByName = customerName.trim().length >= 3 
    ? savedCustomersList.filter(c => c.name && c.name.toLowerCase().includes(customerName.trim().toLowerCase()))
    : [];

  // Theme Class Mapping (Both background and cards match the selected pastel theme)
  const themeClasses: Record<string, { bg: string, cardBg: string, text: string, border: string, hoverColor: string }> = {
    slate: { bg: 'bg-gradient-to-br from-slate-50 via-white to-cyan-50/40', cardBg: 'bg-white/85', text: 'text-slate-900', border: 'border-slate-200', hoverColor: 'hover:bg-cyan-50' },
    green: { bg: 'bg-gradient-to-br from-emerald-50 via-white to-teal-50', cardBg: 'bg-white/85', text: 'text-emerald-950', border: 'border-emerald-200', hoverColor: 'hover:bg-emerald-100' },
    blue: { bg: 'bg-gradient-to-br from-blue-50 via-white to-cyan-50', cardBg: 'bg-white/85', text: 'text-blue-950', border: 'border-blue-200', hoverColor: 'hover:bg-blue-100' },
    purple: { bg: 'bg-[#faf5ff]', cardBg: 'bg-[#f3eafc]', text: 'text-purple-950', border: 'border-purple-200', hoverColor: 'hover:bg-purple-200' },
    amber: { bg: 'bg-[#fffbeb]', cardBg: 'bg-[#fef3c7]', text: 'text-amber-950', border: 'border-amber-200', hoverColor: 'hover:bg-amber-200' },
    rose: { bg: 'bg-[#fff1f2]', cardBg: 'bg-[#ffe4e6]', text: 'text-rose-950', border: 'border-rose-200', hoverColor: 'hover:bg-rose-200' },
  };

  const activeTheme = themeClasses[currentTheme] || themeClasses.slate;

  return (
    <>
      {showSuccessToast && (
        <div className="fixed right-5 top-5 z-[9999] rounded-2xl border border-emerald-400/20 bg-emerald-500 px-6 py-3 font-black text-white shadow-[0_15px_40px_rgba(16,185,129,0.25)]">
          ✅ Bill Saved Successfully
        </div>
      )}
      {showShareToast && (
        <div className="fixed right-5 top-20 z-[9999] rounded-2xl border border-cyan-400/20 bg-cyan-600 px-6 py-3 font-black text-white shadow-[0_15px_40px_rgba(6,182,212,0.25)]">
          📋 Invoice copied to clipboard
        </div>
      )}
      {showCopyQrToast && (
        <div className="fixed right-5 top-5 z-[9999] rounded-2xl border border-emerald-400/20 bg-emerald-500 px-6 py-3 font-black text-white shadow-[0_15px_40px_rgba(16,185,129,0.25)]">
          ✅ Copied to clipboard successfully
        </div>
      )}

      <div className={`w-full max-w-none mx-auto space-y-1.5 relative min-h-screen transition-colors duration-300 px-2 py-1.5 lg:px-3 lg:py-1.5 ${activeTheme.bg} ${activeTheme.text}`} ref={customerDropdownRef}>
        {showStaffModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
            <div className="w-full rounded-3xl border border-slate-200/80 bg-white/95 px-5 py-4 shadow-[0_25px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Lock size={18} className="text-indigo-600" /> Switch Staff / Login
                </h3>
                <button onClick={() => setShowStaffModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Select Staff</label>
                  <select className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white font-bold mt-1 shadow-sm outline-none" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
                    {staffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name} {staff.role ? `(${staff.role})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Enter PIN</label>
                  <input type="password" placeholder="Enter PIN (e.g. 1234)" className="w-full border border-slate-200 rounded-xl p-3 text-sm text-center font-mono text-lg mt-1 shadow-sm outline-none" value={staffPin} onChange={(e) => setStaffPin(e.target.value)} maxLength={6} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowStaffModal(false)} className="flex-1 border border-slate-200 py-3 rounded-xl font-bold text-xs hover:bg-slate-50 text-slate-600">Cancel</button>
                <button onClick={handleVerifyStaffPin} className="flex-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-xs font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5"><ShieldCheck size={16} /> Authorize</button>
              </div>
            </div>
          </div>
        )}

        {showCalculator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-xl">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <Calculator size={18} className="text-indigo-600" /> Balance Calculator
                </h3>
                <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Total charges</label>
                  <div className="w-full border border-slate-200 rounded-2xl p-3 bg-slate-50/50 text-lg font-black text-slate-800">
                    ₹{totalAmount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Customer paid</label>
                  <div className="w-full border border-slate-200 rounded-2xl px-3 py-2 bg-white flex items-center shadow-sm">
                    <input
                      type="number"
                      autoFocus
                      placeholder="500"
                      className="w-full bg-transparent outline-none text-base font-bold text-slate-800"
                      value={customerPaidInput}
                      onChange={(e) => setCustomerPaidInput(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Balance amount</label>
                  <div className="w-full border border-slate-200 rounded-2xl p-3 bg-slate-50/50 text-lg font-black text-emerald-600">
                    ₹{balanceReturnAmount.toFixed(2)}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowCalculator(false)}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-2xl transition text-sm shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showPaymentQRModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
            onClick={() => setShowPaymentQRModal(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <QrCode className="text-indigo-600" size={22} /> Google Pay / UPI QR Code
                </h2>
                <button
                  onClick={() => setShowPaymentQRModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                <div ref={paymentQrBoxRef} className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-inner flex flex-col items-center w-full">
                  <img
                    src={paymentQrImageUrl}
                    alt="GPay QR Code"
                    className="w-56 h-56 rounded-xl border bg-white p-2 shadow object-contain"
                    crossOrigin="anonymous"
                  />
                  <div className="mt-3 text-center">
                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Requested Amount</p>
                    <p className="text-2xl font-black text-slate-900">₹{currentGpayAmount}</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-slate-500 space-y-1">
                <p>UPI ID: <strong className="text-slate-700">{upiPayeeVPA}</strong></p>
                <p>Scan using GPay, PhonePe, Paytm, or any UPI App.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(paymentQrImageUrl, { mode: 'cors' });
                      const blob = await response.blob();
                      
                      const imgBitmap = await createImageBitmap(blob);
                      const canvas = document.createElement('canvas');
                      canvas.width = imgBitmap.width;
                      canvas.height = imgBitmap.height;
                      const ctx = canvas.getContext('2d');
                      
                      if (!ctx) throw new Error("Canvas context failed");
                      ctx.drawImage(imgBitmap, 0, 0);

                      canvas.toBlob(async (pngBlob) => {
                        if (!pngBlob) throw new Error("PNG conversion failed");
                        await navigator.clipboard.write([
                          new ClipboardItem({ "image/png": pngBlob })
                        ]);
                        setShowCopyQrToast(true);
                        setTimeout(() => setShowCopyQrToast(false), 3000);
                      }, "image/png");

                    } catch (err) {
                      console.error("Clipboard copy failed:", err);
                      alert("Unable to copy QR code image to clipboard.");
                    }
                  }}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                >
                  <Share2 size={14} /> Copy
                </button>
                <button
                  onClick={() => setShowPaymentQRModal(false)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showQRModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
            onClick={() => setShowQRModal(false)}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <QrCode className="text-indigo-600" size={22} /> {isModalGPayQr ? "Scan & Pay (Dynamic UPI)" : "WhatsApp QR Code"}
                </h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                <div ref={qrBoxRef} className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl shadow-inner flex flex-col items-center w-full">
                  <img
                    src={activeModalQrImageUrl}
                    alt="QR Code"
                    className="w-56 h-56 rounded-xl border bg-white p-2 shadow object-contain"
                    crossOrigin="anonymous"
                  />
                  {isModalGPayQr && (
                    <div className="mt-3 text-center">
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Requested Amount</p>
                      <p className="text-2xl font-black text-slate-900">₹{currentGpayAmount}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center text-xs text-slate-500 space-y-1">
                {isModalGPayQr ? (
                  <>
                    <p>UPI ID: <strong className="text-slate-700">{upiPayeeVPA}</strong></p>
                    <p>Scan using GPay, PhonePe, Paytm, or any UPI App.</p>
                  </>
                ) : (
                  <p>Scan to connect directly via WhatsApp.</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(activeModalQrImageUrl, { mode: 'cors' });
                      const blob = await response.blob();
                      
                      const imgBitmap = await createImageBitmap(blob);
                      const canvas = document.createElement('canvas');
                      canvas.width = imgBitmap.width;
                      canvas.height = imgBitmap.height;
                      const ctx = canvas.getContext('2d');
                      
                      if (!ctx) throw new Error("Canvas context failed");
                      ctx.drawImage(imgBitmap, 0, 0);

                      canvas.toBlob(async (pngBlob) => {
                        if (!pngBlob) throw new Error("PNG conversion failed");
                        await navigator.clipboard.write([
                          new ClipboardItem({ "image/png": pngBlob })
                        ]);
                        setShowCopyQrToast(true);
                        setTimeout(() => setShowCopyQrToast(false), 3000);
                      }, "image/png");

                    } catch (err) {
                      console.error("Clipboard copy failed:", err);
                      alert("Unable to copy QR code image to clipboard.");
                    }
                  }}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm"
                >
                  <Share2 size={14} /> Copy
                </button>
                <button
                  onClick={() => setIsModalGPayQr(!isModalGPayQr)}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 border border-indigo-200 shadow-sm"
                >
                  🔄 Twist ({isModalGPayQr ? "WhatsApp" : "GPay"})
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compact Service Entry / Billing UI */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <ReceiptText size={18} className="shrink-0 text-blue-600" />
            <h1 className="truncate text-base font-black text-slate-800">
              Billing <span className="text-slate-500">MPM250</span>
            </h1>
            <span className="hidden h-4 w-px bg-slate-300 sm:block" />
            <span className="hidden text-xs font-bold text-slate-600 sm:inline">
              Staff: {currentStaff}
            </span>
            {editId && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                EDIT
              </span>
            )}
            {resumeId && !editId && (
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                RESUME
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 shadow-sm sm:flex">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Date</p>
                <p className="text-[10px] font-black leading-tight text-slate-800">
                  {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Bill Total</p>
                <p className="text-sm font-black leading-tight text-blue-700">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div className="shrink-0">
              <QuickReceiptScan />
            </div>

            <button
              type="button"
              onClick={() => setShowStaffModal(true)}
              className="hidden rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
              title="Switch staff login"
            >
              <User size={13} className="mr-1 inline text-blue-600" />
              Switch Staff
            </button>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-sm">
              <Palette size={12} className="text-indigo-600" />
              <select
                aria-label="Theme"
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value)}
                className="max-w-[110px] bg-transparent text-[10px] font-bold text-slate-700 outline-none"
              >
                <option value="slate">Light Slate</option>
                <option value="green">Soft Green</option>
                <option value="blue">Soft Blue</option>
                <option value="purple">Soft Purple</option>
                <option value="amber">Soft Amber</option>
                <option value="rose">Soft Rose</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
            <div className="mb-1.5 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <User size={14} className="text-blue-600" />
              <h3 className="text-xs font-black text-slate-800">Customer</h3>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
              <div className="relative">
                <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Mobile</label>
                <div className="flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 shadow-sm focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/10">
                  <Phone size={13} className="mr-1.5 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search mobile..."
                    className="min-w-0 w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setShowMobileDropdown(true);
                    }}
                    onFocus={() => setShowMobileDropdown(true)}
                  />
                </div>
                {showMobileDropdown && filteredByMobile.length > 0 && (
                  <div className="absolute left-0 top-full z-30 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                    {filteredByMobile.map((cust, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectCustomer(cust)}
                        className="cursor-pointer border-b border-slate-100 p-2 text-xs hover:bg-cyan-50 last:border-0"
                      >
                        <p className="font-semibold text-slate-700">{cust.name}</p>
                        <p className="text-[10px] font-bold text-indigo-600">{cust.mobile}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Name</label>
                <div className="flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 shadow-sm focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/10">
                  <Search size={13} className="mr-1.5 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Customer name"
                    className="min-w-0 w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowNameDropdown(true);
                    }}
                    onFocus={() => setShowNameDropdown(true)}
                  />
                </div>
                {showNameDropdown && filteredByName.length > 0 && (
                  <div className="absolute left-0 top-full z-30 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                    {filteredByName.map((cust, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectCustomer(cust)}
                        className="cursor-pointer border-b border-slate-100 p-2 text-xs hover:bg-cyan-50 last:border-0"
                      >
                        <p className="font-semibold text-slate-700">{cust.name}</p>
                        <p className="text-[10px] font-bold text-indigo-600">{cust.mobile}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>

        <div className={`${activeTheme.cardBg} rounded-xl border ${activeTheme.border} px-3 py-2 shadow-sm`} ref={dropdownRef}>
          <div className="mb-1.5 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <Plus size={14} className="text-blue-600" />
            <h3 className="text-xs font-black text-slate-800">Add Service</h3>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 items-end">
            <div className="relative md:col-span-2 lg:col-span-5">
              <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Service *</label>
              <div className="flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 shadow-sm focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/10">
                <input
                  ref={serviceInputRef}
                  type="text"
                  placeholder="Select / search service"
                  className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  value={searchService}
                  onChange={(e) => {
                    setSearchService(e.target.value);
                    setShowDropdown(true);
                  }}
                  onClick={() => setShowDropdown(true)}
                />
              </div>
              {showDropdown && (
                <div className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                  {services
                    .filter(s => s.name.toLowerCase().includes(searchService.toLowerCase()))
                    .map(srv => (
                      <div
                        key={srv.id}
                        onClick={() => handleSelectService(srv)}
                        className={`cursor-pointer border-b border-slate-100 p-2 text-xs last:border-0 ${activeTheme.hoverColor}`}
                      >
                        <p className="font-semibold text-slate-900">{srv.name}</p>
                        <p className="text-[10px] font-medium text-slate-600">
                          Srv: ₹{srv.srvChg} | Dept: ₹{srv.deptChg}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="md:col-span-1 lg:col-span-2">
              <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Wallet</label>
              <select
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-cyan-400"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              >
                <option value="Select Wallet">Select Wallet</option>
                {availableWallets.map(w => (
                  <option key={w.id} value={w.name}>{w.name} (₹{w.currentBalance})</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1 lg:col-span-1">
              <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Dept Fee</label>
              <input
                type="number"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-cyan-400"
                value={walletChg === 0 ? '' : walletChg}
                onChange={(e) => setWalletChg(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-1 lg:col-span-1">
              <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Svc Charge</label>
              <input
                type="number"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-cyan-400"
                value={srvChg === 0 ? '' : srvChg}
                onChange={(e) => setSrvChg(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-1 lg:col-span-1">
              <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Qty</label>
              <input
                type="number"
                min="1"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-cyan-400"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>

            <div className="md:col-span-1 lg:col-span-2">
              <label className="mb-0.5 block text-[10px] font-bold text-slate-600">Add</label>
              <button
                onClick={handleAddItem}
                className="flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-xs font-black text-white shadow-md shadow-cyan-500/20 transition hover:-translate-y-0.5"
              >
                <Plus size={14} /> Add Service
              </button>
            </div>
          </div>
        </div>

        <div className={`${activeTheme.cardBg} rounded-xl border ${activeTheme.border} px-3 py-2 shadow-sm`}>
          <div className="mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h4 className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <ReceiptText size={14} className="text-blue-600" /> Bill Items
            </h4>
            <span className="text-[10px] font-bold text-slate-500">{items.length} items</span>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-[54px] items-center justify-center gap-2 text-center text-slate-500">
              <ReceiptText className="opacity-40" size={20} />
              <p className="text-xs font-medium">
                {previousBalance > 0 ? "Settling previous credit balance" : "No services added"}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[9px] uppercase tracking-wide text-slate-500">
                    <th className="w-[3%] px-1.5 py-1.5">#</th>
                    <th className="w-[23%] px-1.5 py-1.5">Service</th>
                    <th className="w-[10%] px-1.5 py-1.5">Dept Fee</th>
                    <th className="w-[13%] px-1.5 py-1.5">Wallet</th>
                    <th className="w-[10%] px-1.5 py-1.5">Svc Charge</th>
                    <th className="w-[6%] px-1.5 py-1.5 text-center">Qty</th>
                    <th className="w-[16%] px-1.5 py-1.5">Status</th>
                    <th className="w-[12%] px-1.5 py-1.5 text-right">Total</th>
                    <th className="w-[7%] px-1.5 py-1.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {items.map((item, index) => (
                    <tr key={item.id} className="font-medium text-slate-800">
                      <td className="px-1.5 py-1.5 text-[10px] text-slate-500">{index + 1}</td>
                      <td className="truncate px-1.5 py-1.5" title={item.name}>{item.name}</td>
                      <td className="px-1.5 py-1.5">
                        <input
                          type="number"
                          className="h-7 w-full min-w-0 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] outline-none focus:border-cyan-400"
                          value={item.walletChg}
                          onChange={(e) => handleItemChange(item.id, 'walletChg', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <select
                          value={item.wallet}
                          onChange={(e) => handleItemChange(item.id, 'wallet', e.target.value)}
                          className="h-7 w-full min-w-0 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] outline-none focus:border-cyan-400"
                        >
                          <option value="Select Wallet">Select Wallet</option>
                          {availableWallets.map(w => (
                            <option key={w.id} value={w.name}>{w.name} (₹{w.currentBalance})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1.5 py-1.5">
                        <input
                          type="number"
                          className="h-7 w-full min-w-0 rounded-md border border-slate-200 bg-white px-1.5 text-[10px] outline-none focus:border-cyan-400"
                          value={item.srvChg}
                          onChange={(e) => handleItemChange(item.id, 'srvChg', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-1.5 py-1.5 text-center">
                        <input
                          type="number"
                          min="1"
                          className="h-7 w-12 rounded-md border border-slate-200 bg-white px-1 text-center text-[10px] outline-none focus:border-cyan-400"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-1.5 py-1.5">
                        <select
                          value={item.status}
                          onChange={(e) => handleItemChange(item.id, 'status', e.target.value)}
                          className="h-7 w-full rounded-md border border-slate-200 bg-white px-1.5 text-[10px] font-semibold outline-none focus:border-cyan-400"
                        >
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                        </select>
                      </td>
                      <td className="px-1.5 py-1.5 text-right font-black">
                        ₹{((Number(item.walletChg) + Number(item.srvChg)) * Number(item.qty)).toFixed(2)}
                      </td>
                      <td className="px-1.5 py-1.5 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="rounded-md p-1 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
          <div className={`lg:col-span-6 ${activeTheme.cardBg} rounded-xl border ${activeTheme.border} px-3 py-2 shadow-sm`}>
            <h3 className="mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-xs font-black text-slate-700">
              <CreditCard size={14} className="text-blue-600" /> Payment & Summary
            </h3>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white/80 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">GPay / UPI</label>
                  <span className="rounded bg-slate-100 px-1 text-[8px] font-mono font-bold text-slate-600">Alt+G</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="0.00"
                    className="h-7 w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
                    value={gpay === 0 ? '' : gpay}
                    onChange={(e) => setGpay(e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPaymentQRModal(true)}
                    className="rounded-md border border-indigo-200 bg-indigo-50 p-1.5 text-indigo-600 transition hover:bg-indigo-100"
                    title="Generate QR for entered amount"
                  >
                    <QrCode size={14} />
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/80 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Cash</label>
                  <span className="rounded bg-slate-100 px-1 text-[8px] font-mono font-bold text-slate-600">Alt+C</span>
                </div>
                <input
                  type="number"
                  placeholder="0.00"
                  className="h-7 w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
                  value={cash === 0 ? '' : cash}
                  onChange={(e) => setCash(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/80 p-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Total Paid</p>
                <p className="text-sm font-black text-slate-800">₹{totalPaid.toFixed(2)}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white/80 p-2">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Balance</p>
                <p className={`text-sm font-black ${balance <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>₹{balance.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={handleSettleCash}
                className="rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-black text-white shadow-sm transition hover:bg-emerald-700"
              >
                Settle Cash <span className="rounded bg-emerald-700 px-1 text-[8px] font-mono">F7</span>
              </button>
              <button
                onClick={() => { setCustomerPaidInput(''); setShowCalculator(true); }}
                className="rounded-lg bg-blue-600 px-2 py-2 text-[10px] font-black text-white shadow-sm transition hover:bg-blue-700"
              >
                <Calculator size={12} className="mr-1 inline" /> Calc
              </button>
              <button
                onClick={handleSaveBill}
                disabled={hasCompletedItems}
                className={`rounded-lg px-2 py-2 text-[10px] font-black shadow-sm transition ${hasCompletedItems ? 'cursor-not-allowed bg-slate-300 text-slate-500 shadow-none' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                title={hasCompletedItems ? "Cannot save when status is Completed. Use Complete Bill." : "Save bill"}
              >
                Save <span className="rounded bg-amber-600 px-1 text-[8px] font-mono">F8</span>
              </button>
            </div>
          </div>

          <div className={`lg:col-span-6 ${activeTheme.cardBg} rounded-xl border ${activeTheme.border} px-3 py-2 shadow-sm`}>
            <h3 className="mb-2 flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-xs font-black text-slate-700">
              <ReceiptText size={14} className="text-blue-600" /> Summary
            </h3>

            <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs">
              <div className="flex justify-between gap-2 font-medium text-slate-700">
                <span>Department Fee</span>
                <span>₹{totalWalletCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2 font-medium text-slate-700">
                <span>Service Charge</span>
                <span>₹{totalServiceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2 font-bold text-slate-800">
                <span>Bill Total</span>
                <span>₹{billTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2 font-medium text-slate-500">
                <span>Previous Balance</span>
                <span>₹{Number(previousBalance).toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2 font-bold text-slate-700">
                <span>Total Paid</span>
                <span>₹{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2 font-bold text-slate-700">
                <span>Balance</span>
                <span className={balance > 0 ? "text-rose-500" : "text-emerald-600"}>₹{balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-sm font-black text-slate-900">Total Amount</span>
              <span className="text-xl font-black text-blue-700">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/80 p-2 shadow-sm sm:flex-row sm:items-center sm:justify-end">
          <button
            onClick={handleCompleteBill}
            disabled={hasInProgressItems}
            className={`order-first rounded-lg px-4 py-2 text-[11px] font-black text-white shadow-sm transition sm:order-none ${hasInProgressItems ? 'cursor-not-allowed bg-slate-300 text-slate-500 shadow-none' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            title={hasInProgressItems ? "Cannot complete bill while items are In Progress. Use Save instead." : "Complete bill"}
          >
            ✓ Complete <span className="rounded bg-emerald-700 px-1 text-[8px] font-mono">F9</span>
          </button>

          <button
            onClick={handlePrint}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Printer size={13} className="mr-1 inline" /> Print
          </button>

          <button
            onClick={() => { setIsModalGPayQr(true); setShowQRModal(true); }}
            className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-[11px] font-black text-cyan-700 shadow-sm transition hover:bg-cyan-100"
          >
            <QrCode size={13} className="mr-1 inline" /> QR
          </button>

          <button
            onClick={handleShare}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <Share2 size={13} className="mr-1 inline" /> Share
          </button>

          <button
            onClick={handleClearForm}
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] font-black text-rose-600 shadow-sm transition hover:bg-rose-100"
          >
            <Trash2 size={13} className="mr-1 inline" /> Clear <span className="rounded bg-rose-100 px-1 text-[8px]">F10</span>
          </button>
        </div>
      </div>
    </>
  );
}

export function ServiceEntryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading form...</div>}>
      <ServiceEntryForm />
    </Suspense>
  );
}

export default ServiceEntryPage;