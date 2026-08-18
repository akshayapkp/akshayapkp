"use client";

import SSLCCalculatorTool from "./tools/SSLCCalculatorTool";
import CashCounterTool from "./tools/CashCounterTool";
import PassportSize from "./tools/PassportSize";
import CropResizeTool from "./tools/CropResizeTool";
import PSCPhotoTool from "./tools/PSCPhotoTool";
import PDFToolkitTool from "./tools/PDFTool";
import LandAreaConverterTool from "./tools/ConverterTool";
import ImageToTextTool from "./tools/ImageToText";
import CalculatorTool from "./tools/calculatol";
import ResumeStudio from "./tools/ResumeStudio";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  Wallet,
  Search,
  DollarSign,
  ArrowUpRight,
  Bell,
  History,
  Megaphone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings,
  GripHorizontal,
  Save,
} from "lucide-react";

interface WalletItem {
  id: string;
  name: string;
  openingBalance: number;
  currentBalance: number;
  lastUpdated: string;
}

interface ServiceItem {
  id?: string;
  title?: string;
  name?: string;
  serviceName?: string;
  url?: string;
  webUrl?: string;
  link?: string;
  note?: string;
}

interface QuickLinkItem {
  id: number | string;
  name: string;
  url: string;
  bgColor: string;
  isInternal: boolean;
}

const CENTRAL_STORAGE_ROW_ID = 999999;
const CENTRAL_STORAGE_KEY = "__smart_akshaya_shared_storage__";

interface LatestEntry {
  billId: string;
  staffName: string;
  customerName: string;
  phone: string;
  serviceName: string;
  totalAmount: number;
  totalPaid: number;
  balance: number;
  dateTime: string;
  timestamp: string;
}

const parseArray = (value: any): any[] => {
  if (!Array.isArray(value)) return [];
  return value;
};

const readLocalArray = (key: string): any[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadCentralDashboardStore = async (): Promise<Record<string, any[]> | null> => {
  try {
    // Central storage is only a shared-sync layer. The dashboard must never
    // crash or open the Next.js error overlay when the row is unavailable,
    // blocked by RLS, or temporarily unreachable. Local storage remains the
    // safe fallback inside refreshLatestEntry().
    const { data, error } = await supabase
      .from("feature_permissions")
      .select("id, permissions")
      .eq("id", CENTRAL_STORAGE_ROW_ID)
      .limit(1);

    if (error || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const payload = data[0]?.permissions;
    if (!payload || typeof payload !== "object") return null;
    if (payload.storageKey && payload.storageKey !== CENTRAL_STORAGE_KEY) return null;

    return payload.data && typeof payload.data === "object"
      ? payload.data as Record<string, any[]>
      : null;
  } catch {
    // Never surface a central-storage read problem to the UI.
    return null;
  }
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState({
    username: "Admin User",
    role: "admin",
  });

  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [todayEntriesCount, setTodayEntriesCount] = useState(0);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [totalCashCollection, setTotalCashCollection] = useState(0);

  const [showAttendancePopup, setShowAttendancePopup] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [showUpdateBubble, setShowUpdateBubble] = useState(false);

  // Popup States for Tools
  const [showCashCounterModal, setShowCashCounterModal] = useState(false);
  const [showSslcModal, setShowSslcModal] = useState(false);
  const [showCropResizeModal, setShowCropResizeModal] = useState(false);
  const [showPassportToolModal, setShowPassportToolModal] = useState(false);
  const [showPscModal, setShowPscModal] = useState(false);
  const [showPdfToolkitModal, setShowPdfToolkitModal] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [showImageToTextModal, setShowImageToTextModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showResumeStudioModal, setShowResumeStudioModal] = useState(false);

  const [showServiceDirectory, setShowServiceDirectory] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const draggedItemIndex = useRef<number | null>(null);
  const draggedOverItemIndex = useRef<number | null>(null);

  const currentVersion = "1.0.0";
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [isLatestEntryOpen, setIsLatestEntryOpen] = useState(false);
  const [latestEntry, setLatestEntry] = useState<LatestEntry | null>(null);
  const [latestEntryStaff, setLatestEntryStaff] = useState("ALL");
  const [latestEntryStaffList, setLatestEntryStaffList] = useState<string[]>([]);
  const [latestEntryLoading, setLatestEntryLoading] = useState(false);
  const latestEntryRef = useRef<HTMLDivElement>(null);

  const [quickLinks, setQuickLinks] = useState<QuickLinkItem[]>([
    {
      id: 1,
      name: "Resume Studio",
      url: "resume-studio-modal",
      bgColor: "from-blue-500 to-blue-600",
      isInternal: true,
    },
    {
      id: 2,
      name: "SSLC Percentage",
      url: "sslc-modal",
      bgColor: "from-purple-500 to-purple-600",
      isInternal: true,
    },
    {
      id: 3,
      name: "Crop & Resize",
      url: "crop-resize-modal",
      bgColor: "from-pink-500 to-pink-600",
      isInternal: true,
    },
    {
      id: 4,
      name: "PSC Creator",
      url: "psc-modal",
      bgColor: "from-teal-500 to-teal-700",
      isInternal: true,
    },
    {
      id: 5,
      name: "Calculator",
      url: "calculator-modal",
      bgColor: "from-amber-500 to-amber-600",
      isInternal: true,
    },
    {
      id: 6,
      name: "Cash Counter",
      url: "cash-counter-modal",
      bgColor: "from-emerald-500 to-emerald-600",
      isInternal: true,
    },
    {
      id: 7,
      name: "Passport Size",
      url: "passport-size-modal",
      bgColor: "from-rose-500 to-pink-600",
      isInternal: true,
    },
    {
      id: 8,
      name: "PDF Tool",
      url: "pdf-toolkit-modal",
      bgColor: "from-indigo-600 to-violet-700",
      isInternal: true,
    },
    {
      id: 9,
      name: "Converter Tool",
      url: "converter-modal",
      bgColor: "from-emerald-500 to-green-700",
      isInternal: true,
    },
    {
      id: 10,
      name: "Image To Text",
      url: "image-to-text-modal",
      bgColor: "from-orange-500 to-red-600",
      isInternal: true,
    },
  ]);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [serviceDirectory, setServiceDirectory] = useState<ServiceItem[]>([]);

  const router = useRouter();

  useEffect(() => {
const loadDashboardData = () => {
  try {
    const savedWallets = localStorage.getItem("managedWallets");

    if (savedWallets) {
      const parsedWallets = JSON.parse(savedWallets);

      setWallets(
        parsedWallets.map((wallet: any) => ({
          ...wallet,
          openingBalance: Number(wallet.openingBalance || 0),
          currentBalance: Number(wallet.currentBalance || 0),
        }))
      );
    } else {
      setWallets([]);
    }
  } catch (err) {
    console.error("Wallet load failed:", err);
    setWallets([]);
  }
      const savedBills = localStorage.getItem("savedBills");
      if (savedBills) {
        try {
          const bills = JSON.parse(savedBills);
          setTodayEntriesCount(bills.length);
          setCompletedTodayCount(bills.length);
          const totalCash = bills.reduce(
            (acc: number, curr: any) =>
              acc + (Number(curr.totalAmount) || Number(curr.amount) || 0),
            0
          );
          setTotalCashCollection(totalCash);
        } catch (e) {}
      }

      const savedQuickLinksOrder = localStorage.getItem("dashboard_quick_links_order");
      let baseTools = quickLinks;
      if (savedQuickLinksOrder) {
        try {
          const parsedOrder = JSON.parse(savedQuickLinksOrder);
          if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
            baseTools = parsedOrder;
          }
        } catch (e) {}
      }

      const customHubLinks = localStorage.getItem("hub_quick_links");
      if (customHubLinks) {
        try {
          const parsedCustom = JSON.parse(customHubLinks);
          const formattedCustom = parsedCustom.map((item: any) => ({
            id: item.id || Date.now() + Math.random(),
            name: item.name || "External Tool",
            url: item.url || "#",
            bgColor: "from-indigo-500 to-violet-600",
            isInternal: false,
          }));
          setQuickLinks([...baseTools, ...formattedCustom]);
        } catch (e) {
          setQuickLinks(baseTools);
        }
      } else {
        setQuickLinks(baseTools);
      }

// REPLACE ONLY THIS BLOCK

let loadedServices: any[] = [];

const savedManagedServices = localStorage.getItem("managedServices");

if (savedManagedServices) {
  try {
    const parsedServices = JSON.parse(savedManagedServices);

    if (Array.isArray(parsedServices)) {
      loadedServices = parsedServices;
    }
  } catch (err) {
    console.error("Error loading managedServices:", err);
  }
}

const filteredWithUrls = loadedServices
  .filter(
    (service: any) =>
      service.portalUrl &&
      service.portalUrl.trim() !== ""
  )
  .map((service: any) => ({
    id: service.id,
    title: service.name,
    url: service.portalUrl,
    note: service.portalUrl.replace(/^https?:\/\//, ""),
  }));

setServiceDirectory(filteredWithUrls);
    };

    loadDashboardData();

    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setTodayDate(
        now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser({
          username: parsed.username || "Admin User",
          role: parsed.role || "staff",
        });

        const logs = JSON.parse(localStorage.getItem("staff_attendance_logs") || "[]");
        const today = new Date().toISOString().split("T")[0];
        const alreadyMarked = logs.some(
          (log: any) =>
            log.staffName?.toLowerCase() === (parsed.username || "").toLowerCase() &&
            new Date(log.timestamp || log.date).toISOString().split("T")[0] === today
        );
        if (!alreadyMarked) setShowAttendancePopup(true);

        const savedVersion = localStorage.getItem("smart_akshaya_app_version") || "1.0.0";
        if (savedVersion !== currentVersion) setShowUpdateBubble(true);

        const savedAnnouncements = localStorage.getItem("hub_announcements");
        if (savedAnnouncements) {
          const parsedAnnouncements = JSON.parse(savedAnnouncements);
          const username = parsed.username || "Admin User";
          const hiddenKey = `hidden_notifications_${username}`;
          const hiddenIds = JSON.parse(localStorage.getItem(hiddenKey) || "[]");
          const filtered = parsedAnnouncements.filter((item: any) => {
            if (hiddenIds.includes(item.id)) return false;
            if (item.targetAll) return true;
            return item.selectedStaff?.includes(username);
          });
          setAnnouncements(filtered);
        }
      } catch (err) {}
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }

      if (latestEntryRef.current && !latestEntryRef.current.contains(target)) {
        const insideLatestModal = (target as HTMLElement)?.closest?.("[data-latest-entry-overlay]");
        if (!insideLatestModal) setIsLatestEntryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLatestEntryPermission = async () => {
      try {
        const { data, error } = await supabase
          .from("feature_permissions")
          .select("permissions")
          .eq("id", 1)
          .maybeSingle();

        if (error || !data?.permissions || cancelled) return;

        const permissions = Array.isArray(data.permissions)
          ? data.permissions
          : [];

        const latestPermission = permissions.find(
          (item: any) =>
            item?.featureName === "Latest Billed Entry" ||
            String(item?.id) === "17"
        );

        if (latestPermission) {
          setLatestEntryPermission({
            accountantAccess: latestPermission.accountantAccess !== false,
            staffAccess: latestPermission.staffAccess !== false,
          });
        }
      } catch {
        // Keep the existing default access if permissions cannot be read.
      }
    };

    loadLatestEntryPermission();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshLatestEntry = async (requestedStaff = latestEntryStaff) => {
    setLatestEntryLoading(true);

    try {
      const localPerformance = readLocalArray("performanceRecords");
      const localServices = readLocalArray("serviceEntries");
      const localDeleted = new Set(readLocalArray("deletedBillIds").map(String));

      let remoteStore: Record<string, any[]> | null = null;
      try {
        remoteStore = await loadCentralDashboardStore();
      } catch {
        remoteStore = null;
      }

      const performanceRecords = parseArray(remoteStore?.performanceRecords).length
        ? parseArray(remoteStore?.performanceRecords)
        : localPerformance;

      const serviceEntries = parseArray(remoteStore?.serviceEntries).length
        ? parseArray(remoteStore?.serviceEntries)
        : localServices;

      const mergedPerformance = new Map<string, any>();

      [...performanceRecords, ...localPerformance].forEach((record: any, index: number) => {
        if (!record || typeof record !== "object") return;

        const key = String(
          record.billId ||
          record.id ||
          `${record.staffName || "staff"}-${record.timestamp || record.date || index}`
        );

        if (!mergedPerformance.has(key)) {
          mergedPerformance.set(key, record);
        }
      });

      const mergedServices = new Map<string, any>();
      [...serviceEntries, ...localServices].forEach((entry: any, index: number) => {
        if (!entry || typeof entry !== "object") return;

        const key = String(
          entry.id ||
          `${entry.billId || "bill"}-${entry.serviceName || entry.service || "service"}-${index}`
        );

        if (!mergedServices.has(key)) {
          mergedServices.set(key, entry);
        }
      });

      const allServices = Array.from(mergedServices.values());

      const staffNames = Array.from(
        new Set(
          Array.from(mergedPerformance.values())
            .map((record: any) => String(record.staffName || record.staff || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      setLatestEntryStaffList(staffNames);

      const candidates = Array.from(mergedPerformance.values())
        .filter((record: any) => {
          const billKey = String(record.billId || record.id || "").trim();
          if (billKey && localDeleted.has(billKey)) return false;

          const staffName = String(record.staffName || record.staff || "").trim();
          return requestedStaff === "ALL" || staffName === requestedStaff;
        })
        .sort((a: any, b: any) => {
          const aTime = new Date(a.timestamp || a.createdAt || a.dateTime || a.date || 0).getTime();
          const bTime = new Date(b.timestamp || b.createdAt || b.dateTime || b.date || 0).getTime();
          return bTime - aTime;
        });

      const latest = candidates[0];

      if (!latest) {
        setLatestEntry(null);
        return;
      }

      const billId = String(latest.billId || latest.id || "").trim();

      const billServices = allServices.filter(
        (entry: any) =>
          String(entry.billId || entry.billID || entry.invoiceId || "").trim() === billId
      );

      const uniqueServiceNames = Array.from(
        new Set(
          billServices
            .map((entry: any) => String(entry.serviceName || entry.service || entry.name || "").trim())
            .filter(Boolean)
        )
      );

      const serviceName =
        uniqueServiceNames.length > 0
          ? uniqueServiceNames.join(" + ")
          : String(latest.serviceName || latest.service || "Service");

      const calculatedServiceTotal = billServices.reduce(
        (sum: number, entry: any) =>
          sum + (Number(entry.totalAmount) || Number(entry.total) || 0),
        0
      );

      setLatestEntry({
        billId,
        staffName: String(latest.staffName || latest.staff || "Admin"),
        customerName: String(latest.customerName || latest.name || "Walk-in"),
        phone: String(latest.phone || latest.customerPhone || latest.mobile || "-"),
        serviceName,
        totalAmount: Number(latest.totalAmount) || calculatedServiceTotal || 0,
        totalPaid: Number(latest.totalPaid ?? latest.paidAmount ?? latest.receivedAmount) || 0,
        balance: Number(latest.balance ?? latest.owedAmount ?? latest.pendingAmount) || 0,
        dateTime: String(latest.dateTime || latest.date || latest.timestamp || "-"),
        timestamp: String(latest.timestamp || latest.createdAt || latest.dateTime || latest.date || ""),
      });
    } catch (error) {
      console.error("Failed to load latest billed entry:", error);
      setLatestEntry(null);
    } finally {
      setLatestEntryLoading(false);
    }
  };

  const handleLatestEntryToggle = async () => {
    const nextOpen = !isLatestEntryOpen;
    setIsLatestEntryOpen(nextOpen);

    if (nextOpen) {
      await refreshLatestEntry("ALL");
    }
  };

  const handleLatestEntryStaffChange = async (staff: string) => {
    setLatestEntryStaff(staff);
    await refreshLatestEntry(staff);
  };

  const handleClearAllNotifications = () => {
    const username = currentUser.username;
    const hiddenKey = `hidden_notifications_${username}`;
    const hiddenIds = announcements.map((item) => item.id);
    localStorage.setItem(hiddenKey, JSON.stringify(hiddenIds));
    setAnnouncements([]);
  };

  const handleDragSort = () => {
    if (draggedItemIndex.current !== null && draggedOverItemIndex.current !== null) {
      const newQuickLinks = [...quickLinks];
      const draggedItemContent = newQuickLinks[draggedItemIndex.current];
      newQuickLinks.splice(draggedItemIndex.current, 1);
      newQuickLinks.splice(draggedOverItemIndex.current, 0, draggedItemContent);
      draggedItemIndex.current = null;
      draggedOverItemIndex.current = null;
      setQuickLinks(newQuickLinks);
    }
  };

  const handleSaveLayout = () => {
    localStorage.setItem("dashboard_quick_links_order", JSON.stringify(quickLinks));
    setIsCustomizing(false);
  };

  const netWalletBalance = wallets.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const isAdmin = currentUser.role.toLowerCase() === "admin";
  const normalizedRole = currentUser.role.toLowerCase().trim();

  // Latest Billed Entry visibility is controlled by Feature Permissions.
  // Admin always has access; Accountant/Staff follow the centrally saved
  // permission values. Existing Latest Entry loading and UI are unchanged.
  const [latestEntryPermission, setLatestEntryPermission] = useState({
    accountantAccess: true,
    staffAccess: true,
  });

  const canViewLatestEntry =
    isAdmin ||
    (normalizedRole === "accountant" ||
      normalizedRole === "account" ||
      normalizedRole === "accounts" ||
      normalizedRole === "account staff" ||
      normalizedRole === "accounts staff"
      ? latestEntryPermission.accountantAccess
      : latestEntryPermission.staffAccess);
  const displayRoleTitle = isAdmin ? "Admin User" : `${currentUser.username} User`;

  const filteredServices = serviceDirectory.filter(
    (s) =>
      (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.note && s.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative min-h-full overflow-x-hidden bg-transparent p-2 sm:p-3 lg:p-4 xl:p-5">
      <div className="smart-akshaya-tool-layer contents">
        {showCashCounterModal && <CashCounterTool onClose={() => setShowCashCounterModal(false)} />}
        {showSslcModal && <SSLCCalculatorTool onClose={() => setShowSslcModal(false)} />}
        {showCropResizeModal && <CropResizeTool onClose={() => setShowCropResizeModal(false)} />}
        {showPassportToolModal && <PassportSize onClose={() => setShowPassportToolModal(false)} />}
        {showPscModal && <PSCPhotoTool onClose={() => setShowPscModal(false)} />}
        {showPdfToolkitModal && <PDFToolkitTool onClose={() => setShowPdfToolkitModal(false)} />}
        {showConverterModal && <LandAreaConverterTool onClose={() => setShowConverterModal(false)} />}
        {showImageToTextModal && <ImageToTextTool onClose={() => setShowImageToTextModal(false)} />}
        {showCalculatorModal && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[5px] sm:p-6"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowCalculatorModal(false);
            }}
          >
            <CalculatorTool onClose={() => setShowCalculatorModal(false)} />
          </div>
        )}
        {showResumeStudioModal && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[6px] sm:p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowResumeStudioModal(false);
            }}
          >
            <div className="relative h-[94vh] w-full max-w-[1450px] overflow-hidden rounded-3xl bg-slate-100 shadow-2xl dark:bg-slate-950">
              <button
                type="button"
                aria-label="Close Resume Studio"
                onClick={() => setShowResumeStudioModal(false)}
                className="absolute right-4 top-4 z-[100] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl font-bold text-slate-600 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
              >
                ×
              </button>
              <div className="h-full overflow-y-auto">
                <ResumeStudio onClose={() => setShowResumeStudioModal(false)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showAttendancePopup && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Good Day 👋</h2>
            <p className="text-slate-500 mb-6">Please mark your attendance to continue.</p>
            <div className="space-y-4">
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">Staff</p>
                <p className="text-xl font-bold text-slate-800">{currentUser.username}</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">Today</p>
                <p className="font-semibold">{todayDate}</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">Current Time</p>
                <p className="text-2xl font-bold text-blue-600">{currentTime}</p>
              </div>
            </div>

            {attendanceSaved ? (
              <div className="mt-8 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                  <span className="text-5xl text-green-600">✓</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold text-green-600">Attendance Marked Successfully</h3>
              </div>
            ) : (
              <button
                onClick={() => {
                  try {
                    const logs = JSON.parse(localStorage.getItem("staff_attendance_logs") || "[]");
                    logs.push({
                      id: Date.now().toString(),
                      staffName: currentUser.username,
                      role: currentUser.role,
                      timestamp: new Date().toISOString(),
                      loginTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    });
                    localStorage.setItem("staff_attendance_logs", JSON.stringify(logs));
                    setAttendanceSaved(true);
                    setTimeout(() => {
                      setShowAttendancePopup(false);
                      setAttendanceSaved(false);
                    }, 2000);
                  } catch (err) {}
                }}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold"
              >
                Mark Attendance
              </button>
            )}
          </div>
        </div>
      )}

      {showUpdateBubble && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-blue-600 text-white rounded-2xl shadow-xl p-4 w-72">
          <h3 className="font-bold text-lg">🚀 New Version Available</h3>
          <p className="text-sm mt-2">Click below to update your application.</p>
          <button
            onClick={() => {
              localStorage.setItem("smart_akshaya_app_version", currentVersion);
              setShowUpdateBubble(false);
              window.location.reload();
            }}
            className="mt-4 w-full bg-white text-blue-600 font-bold py-2 rounded-xl"
          >
            Update Now
          </button>
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-2.5 pb-5">
        <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-4 py-2 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl mb-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Dashboard</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative rounded-2xl border border-slate-200/80 bg-white/70 p-2 text-slate-700 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={19} />
                {announcements.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                    <p className="text-xs text-slate-500">{announcements.length} unread message(s)</p>
                  </div>
                  {announcements.length > 0 && (
                    <button
                      onClick={handleClearAllNotifications}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md transition"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {announcements.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No new notifications.</div>
                  ) : (
                    announcements.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50/80 transition flex items-start gap-3 relative">
                        <span className="absolute top-4 left-3 w-2 h-2 bg-emerald-500 rounded-full mt-1"></span>
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 ml-2">
                          <Megaphone size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                            <span className="text-[10px] text-slate-400 shrink-0">{item.date}</span>
                          </div>
                          {item.subtitle && <p className="text-xs font-semibold text-slate-600 mt-0.5">{item.subtitle}</p>}
                          <p className="text-xs text-slate-500 mt-1">{item.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              )}
            </div>

            {canViewLatestEntry && (
            <div className="relative" ref={latestEntryRef}>
              <button
                onClick={handleLatestEntryToggle}
                className="relative rounded-2xl border border-slate-200/80 bg-white/70 p-2 text-slate-700 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                aria-label="Latest billed entry"
                title="Latest billed entry"
              >
                <History size={19} />
              </button>

            </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-4 text-white shadow-[0_20px_55px_rgba(37,99,235,0.20)] sm:px-6 sm:py-5">
          <div className="relative z-10 pr-2 sm:pr-52">
            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200">{todayDate}</p>
            <h3 className="text-xl font-black tracking-tight sm:text-2xl">Welcome back, {currentUser.username}!</h3>
          </div>
          <div className="absolute bottom-3 right-4 hidden min-w-[150px] rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-right backdrop-blur-xl sm:block">
            <p className="text-[10px] opacity-80 uppercase font-semibold">Logged in as</p>
            <p className="text-xs font-bold">{displayRoleTitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group flex h-[78px] items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]">
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Today's Entries</p>
              <p className="mt-0.5 text-lg font-bold leading-none">{todayEntriesCount}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <FileText size={19} />
            </div>
          </div>

          <div className="group flex h-[78px] items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]">
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Completed Today</p>
              <p className="mt-0.5 text-lg font-bold leading-none">{completedTodayCount}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Wallet size={22} />
            </div>
          </div>

          <div className="group flex h-[78px] items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]">
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Total Cash Collection</p>
              <p className="mt-0.5 text-lg font-bold leading-none">₹{totalCashCollection.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <DollarSign size={22} />
            </div>
          </div>

          <div
            onClick={() => setShowWalletDetails(!showWalletDetails)}
            className="group flex h-[78px] cursor-pointer items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-300/60 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]"
          >
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 flex items-center gap-1">
                Net Wallet Balance {showWalletDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </p>
              <p className={`mt-0.5 text-lg font-bold leading-none ${netWalletBalance < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₹{netWalletBalance.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-fuchsia-50 p-2 text-fuchsia-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Wallet size={22} />
            </div>
          </div>
        </div>

        {showWalletDetails && (
          <div className="rounded-3xl border border-white/80 bg-white/65 p-5 shadow-sm backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Wallet size={16} className="text-fuchsia-600" /> Individual Wallet Balances
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {wallets.map((w) => (
                <div key={w.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">{w.name}</span>
                  <span className={`text-lg font-black mt-2 ${w.currentBalance < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    ₹{w.currentBalance.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h4 className="font-bold text-slate-800">Quick Launch Tools</h4>
              <p className="text-xs text-slate-400">
                {isCustomizing ? "Drag and drop cards using your mouse to rearrange" : "Frequently used utilities"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isCustomizing ? (
                <button
                  onClick={() => setIsCustomizing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  <Settings size={14} />
                  Customize Layout
                </button>
              ) : (
                <button
                  onClick={handleSaveLayout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition"
                >
                  <Save size={14} />
                  Save Layout
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {quickLinks.map((tool, index) => {
              const isCashCounter = tool.name.toLowerCase().includes("cash") || (tool.url && tool.url.toLowerCase().includes("cash"));
              const isSslc = tool.name.toLowerCase().includes("sslc") || (tool.url && tool.url.toLowerCase().includes("sslc"));
              const isCropResize = tool.name.toLowerCase().includes("crop") || (tool.url && tool.url.toLowerCase().includes("crop"));
              const isPsc = tool.name.toLowerCase().includes("psc") || (tool.url && tool.url.toLowerCase().includes("psc"));
              const isPassport = tool.name.toLowerCase().includes("passport") || (tool.url && tool.url.toLowerCase().includes("passport"));
              const isPdfTool = tool.name.toLowerCase().includes("pdf") || tool.url === "pdf-toolkit-modal";
              const isConverterTool = tool.name.toLowerCase().includes("converter") || tool.url === "converter-modal";
              const isImageToTextTool = tool.name.toLowerCase().includes("image") || tool.url === "image-to-text-modal";
              const isCalculatorTool = tool.name.toLowerCase().includes("calculator") || tool.url === "calculator-modal";
              const isResumeStudioTool = tool.name.toLowerCase().includes("resume") || tool.url === "resume-studio-modal";

              return (
                <div
                  key={`${tool.id}-${index}`}
                  draggable={isCustomizing}
                  onDragStart={() => (draggedItemIndex.current = index)}
                  onDragEnter={() => (draggedOverItemIndex.current = index)}
                  onDragEnd={handleDragSort}
                  onDragOver={(e) => e.preventDefault()}
                  className={`relative flex flex-col transition-transform ${isCustomizing ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <a
                    href={
                      isCustomizing || isCashCounter || isSslc || isCropResize || isPsc || isPassport || isPdfTool || isConverterTool || isImageToTextTool || isCalculatorTool || isResumeStudioTool
                        ? undefined
                        : tool.url
                    }
                    onClick={(e) => {
                      if (isCustomizing) {
                        e.preventDefault();
                        return;
                      }
                      if (isCashCounter) {
                        e.preventDefault();
                        setShowCashCounterModal(true);
                      } else if (isSslc) {
                        e.preventDefault();
                        setShowSslcModal(true);
                      } else if (isCropResize) {
                        e.preventDefault();
                        setShowCropResizeModal(true);
                      } else if (isPsc) {
                        e.preventDefault();
                        setShowPscModal(true);
                      } else if (isPassport) {
                        e.preventDefault();
                        setShowPassportToolModal(true);
                      } else if (isPdfTool) {
                        e.preventDefault();
                        setShowPdfToolkitModal(true);
                      } else if (isConverterTool) {
                        e.preventDefault();
                        setShowConverterModal(true);
                      } else if (isImageToTextTool) {
                        e.preventDefault();
                        setShowImageToTextModal(true);
                      } else if (isCalculatorTool) {
                        e.preventDefault();
                        setShowCalculatorModal(true);
                      } else if (isResumeStudioTool) {
                        e.preventDefault();
                        setShowResumeStudioModal(true);
                      }
                    }}
                    target={tool.isInternal ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    className={`flex h-24 flex-col justify-between p-3 bg-gradient-to-br ${
                      tool.bgColor || "from-indigo-500 to-violet-600"
                    } text-white rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.14)] hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-all duration-200 ${
                      isCustomizing ? "ring-2 ring-blue-400 ring-offset-2 opacity-95" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <FileText size={19} />
                      {isCustomizing ? (
                        <GripHorizontal size={20} className="text-white/80" />
                      ) : (
                        !tool.isInternal && <ExternalLink size={16} className="opacity-75" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold block truncate">{tool.name}</span>
                      <span className="text-xs opacity-80">
                        {(tool.isInternal || isCashCounter || isSslc || isCropResize || isPsc || isPassport || isPdfTool || isConverterTool || isImageToTextTool || isCalculatorTool)
                          ? "Internal Tool"
                          : "External Link"}
                      </span>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div 
            onClick={() => setShowServiceDirectory(!showServiceDirectory)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                Service Directory
              </span>
              <h4 className="text-base font-bold text-slate-800">Quickly Access Any Service</h4>
            </div>
            <button className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600 transition">
              {showServiceDirectory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showServiceDirectory && (
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-2">
              <div className="relative w-full max-w-lg mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search for a service..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filteredServices.length === 0 ? (
                  <div className="col-span-full py-8 text-slate-400 text-sm">No services with URLs found matching your search.</div>
                ) : (
                  filteredServices.map((service, index) => (
                    <a
                      key={index}
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-left shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition">{service.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{service.note}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-400 shrink-0 group-hover:text-blue-600 transition" />
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      {canViewLatestEntry && isLatestEntryOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            data-latest-entry-overlay
            className="fixed inset-0 z-[999999] flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 pt-6 backdrop-blur-[3px] sm:pt-10"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsLatestEntryOpen(false);
            }}
          >
            <div className="relative w-full max-w-[30rem] max-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)] animate-in fade-in slide-in-from-top-3 sm:max-h-[calc(100vh-5rem)]">
              <div className="border-b border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Latest Billed Entry</h4>
                    <p className="mt-0.5 text-xs text-slate-500">Latest bill from all staff</p>
                  </div>
                  <History size={18} className="shrink-0 text-blue-600" />
                </div>

                <select
                  value={latestEntryStaff}
                  onChange={(e) => void handleLatestEntryStaffChange(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">All Staff — Latest Entry</option>
                  {latestEntryStaffList.map((staff) => (
                    <option key={staff} value={staff}>
                      {staff}
                    </option>
                  ))}
                </select>
              </div>

              {latestEntryLoading ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  Loading latest entry...
                </div>
              ) : latestEntry ? (
                <div className="p-4">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Staff</p>
                        <p className="truncate text-sm font-bold text-slate-800">{latestEntry.staffName}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
                        <p className="text-lg font-black text-blue-700">₹{latestEntry.totalAmount.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service</p>
                        <p className="text-sm font-semibold text-slate-700">{latestEntry.serviceName}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                          <p className="truncate text-xs font-semibold text-slate-700">{latestEntry.customerName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile</p>
                          <p className="truncate text-xs font-semibold text-slate-700">{latestEntry.phone}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-100 bg-white p-2.5">
                          <p className="text-[10px] text-slate-400">Paid</p>
                          <p className="text-sm font-bold text-emerald-600">₹{latestEntry.totalPaid.toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-white p-2.5">
                          <p className="text-[10px] text-slate-400">Balance</p>
                          <p className={`text-sm font-bold ${latestEntry.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            ₹{latestEntry.balance.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1 text-[10px] text-slate-400">{latestEntry.dateTime}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">No billed entries found.</div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}