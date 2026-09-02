"use client";

import React, { useMemo, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";

import { PerformanceRecord } from "../types";

interface BilledServicesProps {
  records: PerformanceRecord[];
  selectedStaff: string;
  searchQuery: string;
}

export default function BilledServices({
  records,
  selectedStaff,
  searchQuery,
}: BilledServicesProps) {
  // --------------------------------------------------
  // DATE FILTER
  // --------------------------------------------------
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  const [dateError, setDateError] = useState("");

  // --------------------------------------------------
  // SEARCH DATE RANGE
  // --------------------------------------------------
  const handleDateSearch = () => {
    setDateError("");

    if (fromDate && toDate && fromDate > toDate) {
      setDateError("From Date cannot be after To Date.");
      return;
    }

    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  // --------------------------------------------------
  // CLEAR DATE FILTER
  // --------------------------------------------------
  const handleClearDateFilter = () => {
    setFromDate("");
    setToDate("");
    setAppliedFromDate("");
    setAppliedToDate("");
    setDateError("");
  };

  // --------------------------------------------------
  // CONVERT TIMESTAMP TO LOCAL DATE KEY
  // YYYY-MM-DD
  // --------------------------------------------------
  const getLocalDateKey = (value: unknown): string => {
    const raw = String(value ?? "").trim();

    if (!raw) return "";

    // Already YYYY-MM-DD
    const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoDateOnly) {
      return `${isoDateOnly[1]}-${isoDateOnly[2]}-${isoDateOnly[3]}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const indianDate = raw.match(
      /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/
    );

    if (indianDate) {
      const day = String(Number(indianDate[1])).padStart(2, "0");
      const month = String(Number(indianDate[2])).padStart(2, "0");
      const year = indianDate[3];

      return `${year}-${month}-${day}`;
    }

    // Timestamp / normal date
    const parsed = new Date(raw);

    if (!Number.isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, "0");
      const day = String(parsed.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    return "";
  };

  // --------------------------------------------------
  // FILTER RECORDS
  // --------------------------------------------------
  const staffFilteredRecords = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return records.filter((record) => {
      // ----------------------------------------------
      // STAFF FILTER
      // ----------------------------------------------
      const matchesStaff =
        selectedStaff === "All" ||
        record.staffName?.trim().toLowerCase() ===
          selectedStaff.trim().toLowerCase();

      if (!matchesStaff) {
        return false;
      }

      // ----------------------------------------------
      // DATE FILTER
      // ----------------------------------------------
      const recordDate = getLocalDateKey(record.timestamp);

      if (!recordDate) {
        return false;
      }

      if (
        appliedFromDate &&
        recordDate < appliedFromDate
      ) {
        return false;
      }

      if (
        appliedToDate &&
        recordDate > appliedToDate
      ) {
        return false;
      }

      // ----------------------------------------------
      // TEXT SEARCH
      // ----------------------------------------------
      if (!normalizedSearch) {
        return true;
      }

      const customerName =
        record.customerName?.toLowerCase() || "";

      const staffName =
        record.staffName?.toLowerCase() || "";

      return (
        customerName.includes(normalizedSearch) ||
        staffName.includes(normalizedSearch)
      );
    });
  }, [
    records,
    selectedStaff,
    searchQuery,
    appliedFromDate,
    appliedToDate,
  ]);

  // --------------------------------------------------
  // TOTAL SERVICE CHARGE
  // --------------------------------------------------
  const totalServiceCharge =
    staffFilteredRecords.reduce(
      (acc, curr) =>
        acc + Number(curr.serviceCharge || 0),
      0
    );

  // --------------------------------------------------
  // TOTAL DEPARTMENT FEE
  // --------------------------------------------------
  const totalDepartmentFee =
    staffFilteredRecords.reduce(
      (acc, curr) =>
        acc + Number(curr.departmentFee || 0),
      0
    );

  // --------------------------------------------------
  // TOTAL COLLECTION
  // --------------------------------------------------
  const totalFilteredCollection =
    staffFilteredRecords.reduce(
      (acc, curr) =>
        acc + Number(curr.totalAmount || 0),
      0
    );

  // --------------------------------------------------
  // DISPLAY
  // --------------------------------------------------
  return (
    <div className="space-y-4">
      {/* ------------------------------------------------
          DATE FILTER BAR
      ------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* FROM DATE */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              From Date
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDateError("");
              }}
              className="h-10 min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* TO DATE */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDateError("");
              }}
              className="h-10 min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* SEARCH BUTTON */}
          <button
            type="button"
            onClick={handleDateSearch}
            className="h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <Search size={16} />
            Search
          </button>

          {/* CLEAR BUTTON */}
          {(fromDate ||
            toDate ||
            appliedFromDate ||
            appliedToDate) && (
            <button
              type="button"
              onClick={handleClearDateFilter}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>

        {/* DATE ERROR */}
        {dateError && (
          <p className="mt-2 text-xs font-semibold text-red-500">
            {dateError}
          </p>
        )}

        {/* ACTIVE DATE RANGE */}
        {(appliedFromDate || appliedToDate) && !dateError && (
          <div className="mt-3 text-xs font-medium text-slate-500">
            Showing records from{" "}
            <span className="font-bold text-indigo-600">
              {appliedFromDate || "Beginning"}
            </span>{" "}
            to{" "}
            <span className="font-bold text-indigo-600">
              {appliedToDate || "Today"}
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------
          NO RECORDS
      ------------------------------------------------ */}
      {staffFilteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="text-center py-12 text-slate-400">
            <ShieldAlert
              size={40}
              className="mx-auto mb-2 opacity-40"
            />

            <p className="text-sm font-semibold">
              No billed service records found.
            </p>

            {(appliedFromDate || appliedToDate) && (
              <p className="mt-1 text-xs text-slate-400">
                Try selecting a different date range.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* ------------------------------------------------
           BILLING TABLE
        ------------------------------------------------ */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">
                    Date / Time
                  </th>

                  <th className="py-3 px-4">
                    Staff Name
                  </th>

                  <th className="py-3 px-4">
                    Customer Name
                  </th>

                  <th className="py-3 px-4 text-right">
                    Service Chg.
                  </th>

                  <th className="py-3 px-4 text-right">
                    Dept Fee
                  </th>

                  <th className="py-3 px-4 text-right">
                    Total Amount
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {staffFilteredRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 transition text-slate-700"
                  >
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                      {new Date(
                        rec.timestamp
                      ).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-indigo-600">
                      <span className="bg-indigo-50 px-2.5 py-1 rounded-lg text-xs">
                        {rec.staffName || "Admin User"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-medium">
                      {rec.customerName ||
                        "Walk-in Customer"}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                      ₹
                      {Number(
                        rec.serviceCharge || 0
                      ).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-amber-600">
                      ₹
                      {Number(
                        rec.departmentFee || 0
                      ).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      ₹
                      {Number(
                        rec.totalAmount || 0
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-200">
                  <td
                    colSpan={3}
                    className="py-3.5 px-4 text-right uppercase text-xs"
                  >
                    Total Sum:
                  </td>

                  <td className="py-3.5 px-4 text-right text-emerald-700">
                    ₹{totalServiceCharge.toFixed(2)}
                  </td>

                  <td className="py-3.5 px-4 text-right text-amber-700">
                    ₹{totalDepartmentFee.toFixed(2)}
                  </td>

                  <td className="py-3.5 px-4 text-right text-slate-900 text-base">
                    ₹{totalFilteredCollection.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}