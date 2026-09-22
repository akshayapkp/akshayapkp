"use client";

import {
  SquarePen,
  Trash2,
  Calendar,
  Filter,
  Search,
  User,
  FolderOpen,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkItem } from "./types";
import { supabase } from "@/lib/supabase";
import { getWorks, updateWork, deleteWork } from "./storage";

type WorkStatus =
  | "Pending"
  | "Processing"
  | "Completed"
  | "Delivered";

type CustomerApplication = { applicationNumber: string; service: string; audience: string; customer: Record<string, string>; documentNames: string[]; submittedAt: string; status: string; };\nconst CENTRAL_STORAGE_ROW_ID = 999999;\nconst CENTRAL_STORAGE_KEY = "__smart_akshaya_shared_storage__";\nconst APPLICATION_STATUSES = ["Submitted", "Under Review", "Processing", "Approved", "Ready for Collection", "Rejected", "Completed"];

export default function WorkStatusPage() {
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [editingWork, setEditingWork] = useState<WorkItem | null>(null);
  const [customerApplications, setCustomerApplications] = useState<CustomerApplication[]>([]);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationsLoading, setApplicationsLoading] = useState(true);

const [previewReceipt, setPreviewReceipt] = useState<{
  url: string;
  type: "image" | "pdf";
} | null>(null);
    useEffect(() => {
    setWorks(getWorks());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCustomerApplications() {
      setApplicationsLoading(true);
      try {
        const { data } = await supabase.from("feature_permissions").select("permissions").eq("id", CENTRAL_STORAGE_ROW_ID).maybeSingle();
        const stored = Array.isArray(data?.permissions?.data?.customerApplications) ? data.permissions.data.customerApplications as CustomerApplication[] : [];
        if (!cancelled) setCustomerApplications(stored);
      } finally {
        if (!cancelled) setApplicationsLoading(false);
      }
    }
    loadCustomerApplications();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        works.map((work) => (work.service || "Others").trim())
      )
    ).sort();

    return ["All", ...values];
  }, [works]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: works.length,
    };

    works.forEach((work) => {
      const key = (work.service || "Others").trim();

      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }, [works]);

  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return "";

    const user = JSON.parse(
      localStorage.getItem("loggedInUser") || "{}"
    );

    return user.username || "";
  }, []);
    const handleStatusChange = (
    id: string,
    newStatus: WorkStatus
  ) => {
    const workToUpdate = works.find((w) => w.id === id);

    if (!workToUpdate) return;

    updateWork({
      ...workToUpdate,
      status: newStatus,
    });

    setWorks(getWorks());
  };

  const handleCustomerApplicationStatus = async (applicationNumber: string, status: string) => {
    const updated = customerApplications.map((application) =>
      application.applicationNumber === applicationNumber ? { ...application, status } : application
    );
    setCustomerApplications(updated);
    try {
      const { data, error } = await supabase.from("feature_permissions").select("permissions").eq("id", CENTRAL_STORAGE_ROW_ID).maybeSingle();
      if (error) throw error;
      const permissions = data?.permissions && typeof data.permissions === "object" ? data.permissions : { storageKey: CENTRAL_STORAGE_KEY, data: {} };
      const updatedPermissions = {
        storageKey: permissions.storageKey || CENTRAL_STORAGE_KEY,
        data: { ...(permissions.data || {}), customerApplications: updated },
      };
      await supabase.from("feature_permissions").upsert(
        { id: CENTRAL_STORAGE_ROW_ID, permissions: updatedPermissions, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    } catch {
      alert("Status save ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.");
      const { data } = await supabase.from("feature_permissions").select("permissions").eq("id", CENTRAL_STORAGE_ROW_ID).maybeSingle();
      const stored = Array.isArray(data?.permissions?.data?.customerApplications) ? data.permissions.data.customerApplications as CustomerApplication[] : [];
      setCustomerApplications(stored);
    }
  };

  const filteredCustomerApplications = useMemo(() => {
    const q = applicationSearch.trim().toLowerCase();
    if (!q) return customerApplications;
    return customerApplications.filter((application) =>
      application.applicationNumber.includes(q) ||
      application.service.toLowerCase().includes(q) ||
      String(application.customer?.name || "").toLowerCase().includes(q) ||
      String(application.customer?.mobile || "").includes(q)
    );
  }, [customerApplications, applicationSearch]);

  const handleDelete = (id: string) => {
    if (!confirm("ഈ വർക്ക് ഡിലീറ്റ് ചെയ്യണമെന്നുണ്ടോ?")) return;

    deleteWork(id);
    setWorks(getWorks());
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingWork) return;

    updateWork(editingWork);
    setWorks(getWorks());
    setEditingWork(null);
  };
    const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchesSearch =
        (work.name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (work.phone || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (work.reference || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (work.service || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === "All" ||
        work.status === selectedStatus;

      const matchesCategory =
        selectedCategory === "All" ||
        (work.service || "Others") === selectedCategory;

      let matchesDate = true;

      if (selectedDate && work.date && work.date !== "N/A") {
        const parts = work.date.split("/");

        if (parts.length === 3) {
          const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
          matchesDate = formatted.startsWith(selectedDate);
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesDate
      );
    });
  }, [
    works,
    searchQuery,
    selectedStatus,
    selectedCategory,
    selectedDate,
  ]);
    const counts = useMemo(() => {
    return {
      pending: works.filter((w) => w.status === "Pending").length,
      processing: works.filter((w) => w.status === "Processing").length,
      completed: works.filter(
        (w) =>
          w.status === "Completed" ||
          w.status === "Delivered"
      ).length,
      total: works.length,
    };
  }, [works]);

  const staffCounts = useMemo(() => {
    const map: Record<string, number> = {};

    works.forEach((work: any) => {
      const staff = work.addedBy || work.staff || "Unknown";

      map[staff] = (map[staff] || 0) + 1;
    });

    return map;
  }, [works]);

  const topStaff = Object.entries(staffCounts).sort(
    (a, b) => b[1] - a[1]
  );
    return (
    <div className="mx-auto min-h-screen w-full max-w-[1500px] space-y-5 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-4 sm:p-5 lg:p-6">
      <div className="mb-5">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Work Status
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
              Track, filter and manage all service works.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 px-5 py-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-700">
              Logged In Staff
            </p>
            <p className="mt-1 flex items-center gap-2 font-black text-slate-900">
              <User size={16} />
              {currentUser || "Admin"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <p className="text-sm font-medium text-yellow-700">
              Pending
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {counts.pending}
            </h2>
          </div>

          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
            <p className="text-sm font-medium text-blue-700">
              Processing
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {counts.processing}
            </h2>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
            <p className="text-sm font-medium text-green-700">
              Completed
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {counts.completed}
            </h2>
          </div>

          <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
            <p className="text-sm font-medium text-violet-700">
              Total Works
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {counts.total}
            </h2>
          </div>
        </div>
      </div>
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Name, Phone, Reference, Service..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-500" />

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <FolderOpen size={18} />
            <h3 className="font-black text-slate-800">
              Service Categories
            </h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-black transition-all ${
                  selectedCategory === category
                    ? "border-cyan-500 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                    : "border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50"
                }`}
              >
                {category} ({categoryCounts[category] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>
            {/* Status Filter */}
      <div className="mt-5 flex flex-wrap gap-3">
        {[
          "All",
          "Pending",
          "Processing",
          "Completed",
          "Delivered",
        ].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              selectedStatus === status
                ? "border-cyan-500 bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                : "border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-cyan-200/80 bg-white/95 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800">Customer Applications</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">Website വഴി വന്ന അപേക്ഷകൾക്കും customer-visible status-നും ഇവിടെ update ചെയ്യാം.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={applicationSearch} onChange={e => setApplicationSearch(e.target.value)} placeholder="Application No / Name / Service" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-cyan-400 focus:bg-white"/>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {applicationsLoading ? <div className="rounded-2xl bg-slate-50 p-8 text-center text-xs text-slate-400">Applications loading...</div> :
          filteredCustomerApplications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">No customer applications found.</div> :
          filteredCustomerApplications.map(application => (
            <div key={application.applicationNumber} className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-cyan-50/30 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-black tracking-widest text-white">{application.applicationNumber}</span>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black text-cyan-700">{application.service}</span>
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-800">{application.customer?.name || "Customer"}</p>
                  <p className="text-xs text-slate-500">{application.customer?.mobile || ""} · {application.audience}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Customer Status</span>
                  <select value={application.status} onChange={e => handleCustomerApplicationStatus(application.applicationNumber, e.target.value)} className="min-w-44 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-black text-cyan-700 outline-none">
                    {APPLICATION_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Works */}
      <div className="mt-5 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6">
        <div className="mb-5 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-xl font-black tracking-tight text-slate-800">
            Works ({filteredWorks.length})
          </h2>

          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold">
              {selectedCategory}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {filteredWorks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
              <h3 className="text-lg font-black">
                No Works Found
              </h3>

              <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                No records available for this category.
              </p>
            </div>
          )}

          {filteredWorks.map((work) => {
            const workId = work.id || work.reference;

            return (
              <div
                key={workId}
                className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg"
              >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                        {work.service}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                        {work.status}
                      </span>
                    </div>

<h3 className="text-lg font-black text-slate-900">
  👤 {work.name || "Unknown Name"}
</h3>

{work.phone && (
  <p className="text-sm font-medium text-slate-600">
    📞 {work.phone}
  </p>
)}

<p className="text-sm font-medium text-slate-600">
  📄 Application No: {work.reference || "N/A"}
</p>

{(work as any).registrationNo && (
  <p className="text-sm font-medium text-slate-600">
    🔢 Registration No: {(work as any).registrationNo}
  </p>
)}

<p className="text-sm font-medium text-slate-600">
  📅 {work.date || "N/A"}
</p>

                    <p className="text-sm font-medium text-slate-600">
                      👨‍💼 Added By :{" "}
                      <span className="font-semibold text-emerald-700">
                        {(work as any).addedBy ||
                          work.staff ||
                          "Unknown"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <select
                      value={work.status}
                      onChange={(e) =>
                        handleStatusChange(
                          workId,
                          e.target.value as WorkStatus
                        )
                      }
                      className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-black text-cyan-700 outline-none transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">
                        Processing
                      </option>
                      <option value="Completed">
                        Completed
                      </option>
                      <option value="Delivered">
                        Delivered
                      </option>
                    </select>

                    <div className="flex flex-wrap gap-2">
{(work as any).receiptUrl && (
  <button
    onClick={() =>
      setPreviewReceipt({
        url: (work as any).receiptUrl,
        type: ((work as any).receiptType || "image") as
          | "image"
          | "pdf",
      })
    }
    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
  >
    👁 Preview
  </button>
)}

<button
  onClick={() =>
    setEditingWork(work)
  }
  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-amber-500/15 transition-all hover:-translate-y-0.5"
>
                        <SquarePen size={16} />
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(workId)
                        }
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-500/15 transition-all hover:-translate-y-0.5"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
{previewReceipt && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
    <div className="relative h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.3)]">

      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <h2 className="text-xl font-black tracking-tight text-slate-900">
          Receipt Preview
        </h2>

        <div className="flex gap-2">

          <button
            onClick={() =>
              window.open(previewReceipt.url, "_blank")
            }
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg"
          >
            Open
          </button>

          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = previewReceipt.url;
              a.download = "Receipt";
              a.click();
            }}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-lg"
          >
            Download
          </button>

          <button
           onClick={() => {
  const win = window.open("", "_blank");

  if (!win) return;

  if (previewReceipt.type === "pdf") {
    win.location.href = previewReceipt.url;
  } else {
    win.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body{
              margin:0;
              display:flex;
              justify-content:center;
              align-items:center;
              background:#fff;
            }
            img{
              max-width:100%;
              max-height:100vh;
            }
          </style>
        </head>
        <body>
          <img src="${previewReceipt.url}" />
          <script>
            window.onload=()=>{
              window.print();
            }
          </script>
        </body>
      </html>
    `);

    win.document.close();
  }
}}
            className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-2 text-xs font-black text-white shadow-lg"
          >
            Print
          </button>

          <button
            onClick={() => setPreviewReceipt(null)}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-xs font-black text-white shadow-lg"
          >
            Close
          </button>

        </div>
      </div>

      <div className="h-[calc(92vh-72px)] overflow-auto bg-slate-100">

        {previewReceipt.type === "pdf" ? (
<iframe
  src={previewReceipt.url}
  title="Receipt Preview"
  className="h-full w-full"
/>
        ) : (
<img
  src={previewReceipt.url}
  alt="Receipt Preview"
  className="mx-auto h-full max-w-full object-contain select-none"
/>
        )}

      </div>
    </div>
  </div>
)}

{/* Edit Modal */}
      {editingWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-2xl">
            <h3 className="mb-5 text-xl font-black tracking-tight text-slate-800">
              Edit Work
            </h3>

            <form
              onSubmit={handleSaveEdit}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Name
                </label>

                <input
                  type="text"
                  value={editingWork.name}
                  onChange={(e) =>
                    setEditingWork({
                      ...editingWork,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Phone
                </label>

                <input
                  type="text"
                  value={editingWork.phone}
                  onChange={(e) =>
                    setEditingWork({
                      ...editingWork,
                      phone: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Reference Number
                </label>

                <input
                  type="text"
                  value={editingWork.reference}
                  onChange={(e) =>
                    setEditingWork({
                      ...editingWork,
                      reference: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Date
                </label>

                <input
                  type="text"
                  value={editingWork.date}
                  onChange={(e) =>
                    setEditingWork({
                      ...editingWork,
                      date: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-sm font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingWork(null)}
                  className="rounded-xl px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}