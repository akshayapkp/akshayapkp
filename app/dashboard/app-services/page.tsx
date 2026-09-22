"use client";

import { CalendarDays, FileText, Search, Save, UserRound, Hash, Filter, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CustomerApplication = {
  applicationNumber: string;
  service: string;
  audience: string;
  customer: Record<string, string>;
  documentNames: string[];
  submittedAt: string;
  status: string;
  note?: string;
  updatedAt?: string;
};

const CENTRAL_STORAGE_ROW_ID = 999999;
const CENTRAL_STORAGE_KEY = "__smart_akshaya_shared_storage__";

const APPLICATION_STATUSES = [
  "Submitted",
  "Under Review",
  "Processing",
  "Documents Pending",
  "Payment Pending",
  "Approved",
  "Application Ready",
  "Ready for Collection",
  "Rejected",
  "Completed",
];

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateKey(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AppServicesPage() {
  const [applications, setApplications] = useState<CustomerApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [savingNumber, setSavingNumber] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      setLoading(true);
      setMessage("");

      try {
        const { data, error } = await supabase
          .from("feature_permissions")
          .select("permissions")
          .eq("id", CENTRAL_STORAGE_ROW_ID)
          .maybeSingle();

        if (error) throw error;

        const stored = Array.isArray(data?.permissions?.data?.customerApplications)
          ? (data.permissions.data.customerApplications as CustomerApplication[])
          : [];

        if (!cancelled) setApplications(stored);
      } catch (error) {
        console.error("App Services load error:", error);
        if (!cancelled) setMessage("Customer applications load ചെയ്യാൻ കഴിഞ്ഞില്ല.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applications.filter((application) => {
      const customerName = String(application.customer?.name || "").toLowerCase();
      const mobile = String(application.customer?.mobile || "");
      const service = String(application.service || "").toLowerCase();
      const number = String(application.applicationNumber || "").toLowerCase();

      const matchesSearch =
        !query ||
        number.includes(query) ||
        customerName.includes(query) ||
        mobile.includes(query) ||
        service.includes(query);

      const submittedDate = dateKey(application.submittedAt);
      const matchesFromDate = !fromDate || submittedDate >= fromDate;
      const matchesToDate = !toDate || submittedDate <= toDate;
      const matchesStatus =
        selectedStatus === "All" || String(application.status || "Submitted") === selectedStatus;

      return matchesSearch && matchesFromDate && matchesToDate && matchesStatus;
    });
  }, [applications, searchQuery, fromDate, toDate, selectedStatus]);

  async function saveApplication(application: CustomerApplication) {
    setSavingNumber(application.applicationNumber);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("feature_permissions")
        .select("permissions")
        .eq("id", CENTRAL_STORAGE_ROW_ID)
        .maybeSingle();

      if (error) throw error;

      const permissions =
        data?.permissions && typeof data.permissions === "object"
          ? data.permissions
          : { storageKey: CENTRAL_STORAGE_KEY, data: {} };

      const stored = Array.isArray(permissions?.data?.customerApplications)
        ? (permissions.data.customerApplications as CustomerApplication[])
        : applications;

      const updatedApplications = stored.map((item) =>
        item.applicationNumber === application.applicationNumber
          ? {
              ...item,
              status: application.status,
              note: application.note?.trim() || "",
              updatedAt: new Date().toISOString(),
            }
          : item
      );

      const updatedPermissions = {
        storageKey: permissions.storageKey || CENTRAL_STORAGE_KEY,
        data: {
          ...(permissions.data || {}),
          customerApplications: updatedApplications,
        },
      };

      const { error: saveError } = await supabase
        .from("feature_permissions")
        .upsert(
          {
            id: CENTRAL_STORAGE_ROW_ID,
            permissions: updatedPermissions,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (saveError) throw saveError;

      setApplications(updatedApplications);
      localStorage.setItem(
        "akshaya_customer_applications",
        JSON.stringify(updatedApplications)
      );
      setMessage(`Application ${application.applicationNumber} updated.`);
    } catch (error) {
      console.error("App Services save error:", error);
      setMessage("Status / note save ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക.");
    } finally {
      setSavingNumber("");
    }
  }

  function updateLocal(
    applicationNumber: string,
    patch: Partial<CustomerApplication>
  ) {
    setApplications((current) =>
      current.map((application) =>
        application.applicationNumber === applicationNumber
          ? { ...application, ...patch }
          : application
      )
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px]">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700">
                <FileText size={13} />
                App Services
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Customer Applications
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Website വഴി വന്ന customer applications date, number, name, mobile എന്നിവ ഉപയോഗിച്ച് കണ്ടെത്തി status / note update ചെയ്യാം.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 px-5 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-cyan-700">
                Total Applications
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {applications.length}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(280px,1fr)_auto_auto_auto]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Application No / Name / Mobile / Service"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
              />
            </div>

            <label className="flex min-w-[170px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
              <CalendarDays size={18} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="min-w-0 bg-transparent text-sm font-bold text-slate-700 outline-none"
              />
            </label>

            <label className="flex min-w-[170px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5">
              <CalendarDays size={18} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="min-w-0 bg-transparent text-sm font-bold text-slate-700 outline-none"
              />
            </label>

            <div className="flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50/60 px-4 py-2.5">
              <Filter size={17} className="text-cyan-700" />
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="min-w-[145px] bg-transparent text-sm font-black text-cyan-800 outline-none"
              >
                <option value="All">All Applications</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold text-slate-400">
              Showing <span className="text-slate-700">{filteredApplications.length}</span> of {applications.length} applications
            </p>
            {(fromDate || toDate || selectedStatus !== "All" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFromDate("");
                  setToDate("");
                  setSelectedStatus("All");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <RotateCcw size={13} />
                Clear Filters
              </button>
            )}
          </div>

          {message && (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs font-bold text-cyan-800">
              {message}
            </div>
          )}
        </section>

        <section className="mt-5">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400 shadow-sm">
              Customer applications loading...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <FileText className="mx-auto text-slate-300" size={36} />
              <h2 className="mt-3 text-lg font-black text-slate-700">
                No Applications Found
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Search / date / status filter മാറ്റി വീണ്ടും നോക്കൂ.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <article
                  key={application.applicationNumber}
                  className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition hover:border-cyan-200 hover:shadow-lg sm:p-6"
                >
                  <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-black tracking-[0.18em] text-white">
                          <Hash size={14} />
                          {application.applicationNumber}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600">
                          {formatDate(application.submittedAt)}
                        </span>
                      </div>

                      <h2 className="mt-4 flex items-center gap-2 text-lg font-black text-slate-900">
                        <UserRound size={18} className="text-cyan-600" />
                        {application.customer?.name || "Customer"}
                      </h2>

                      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                        <p><span className="text-slate-400">Mobile:</span> {application.customer?.mobile || "—"}</p>
                        <p><span className="text-slate-400">Service:</span> {application.service}</p>
                        <p><span className="text-slate-400">For:</span> {application.audience || "—"}</p>
                        <p><span className="text-slate-400">Documents:</span> {application.documentNames?.length || 0}</p>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Submitted
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          {new Date(application.submittedAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/70 via-white to-blue-50/60 p-4 sm:p-5">
                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <label>
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Application Status
                          </span>
                          <select
                            value={application.status || "Submitted"}
                            onChange={(event) =>
                              updateLocal(application.applicationNumber, {
                                status: event.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-cyan-200 bg-white px-3.5 py-3 text-sm font-black text-cyan-700 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                          >
                            {APPLICATION_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          type="button"
                          onClick={() => saveApplication(application)}
                          disabled={savingNumber === application.applicationNumber}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Save size={16} />
                          {savingNumber === application.applicationNumber ? "Saving..." : "Save"}
                        </button>
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Note / Customer Message
                        </span>
                        <textarea
                          value={application.note || ""}
                          onChange={(event) =>
                            updateLocal(application.applicationNumber, {
                              note: event.target.value,
                            })
                          }
                          rows={3}
                          placeholder="ഉദാ: Aadhaar copy pending / Payment ₹500 pending / Original document കൊണ്ടുവരണം..."
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
                        />
                      </label>

                      {application.note && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800">
                          Customer-visible note: {application.note}
                        </div>
                      )}

                      {application.updatedAt && (
                        <p className="mt-3 text-[10px] font-semibold text-slate-400">
                          Last updated: {new Date(application.updatedAt).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
