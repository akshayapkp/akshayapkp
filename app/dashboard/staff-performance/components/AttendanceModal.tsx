"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  PerformanceRecord,
  Holiday,
} from "../types";

interface AttendanceModalProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  record: PerformanceRecord | null;
  holiday: Holiday | null;
  onHolidayChange: () => void;
  selectedStaff: string;
}

export default function AttendanceModal({
  open,
  onClose,
  date,
  record,
  holiday,
  onHolidayChange,
  selectedStaff,
}: AttendanceModalProps) {

  const [holidayName, setHolidayName] =
    useState("");

  const [holidayList, setHolidayList] =
    useState<Holiday[]>([]);

  const [editing, setEditing] =
    useState(false);

  useEffect(() => {

    const saved =
      localStorage.getItem("holidays");

    if (saved) {
      setHolidayList(JSON.parse(saved));
    }

  }, []);

  useEffect(() => {

    if (holiday) {
      setHolidayName(holiday.name);
      setEditing(true);
    } else {
      setHolidayName("");
      setEditing(false);
    }

  }, [holiday]);

  if (!open || !date) return null;

  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const billedTotals = getDailyBilledTotals(dateString, selectedStaff);
  const hasBilledTotals = billedTotals.count > 0;
  const totalServices = hasBilledTotals ? billedTotals.count : Number(record?.totalServices || 0);
  const departmentFee = hasBilledTotals ? billedTotals.departmentFee : Number(record?.departmentFee || 0);
  const serviceCharge = hasBilledTotals ? billedTotals.serviceCharge : Number(record?.serviceCharge || 0);
  const totalAmount = hasBilledTotals ? billedTotals.totalAmount : Number(record?.totalAmount || 0);

const saveHoliday = () => {
  if (!holidayName.trim()) return;

  let updated = [...holidayList];

  if (editing && holiday) {
    updated = updated.map((item) =>
      item.date === holiday.date
        ? {
            ...item,
            name: holidayName.trim(),
          }
        : item
    );
  } else {
    updated.push({
      id: Date.now().toString(),
      date: dateString,
      name: holidayName.trim(),
    });
  }

  localStorage.setItem(
    "holidays",
    JSON.stringify(updated)
  );

setHolidayList(updated);

onHolidayChange();

onClose();
};

  const deleteHoliday = () => {

    if (!holiday) return;

    const updated =
      holidayList.filter(
        (item) =>
          item.date !== holiday.date
      );

    localStorage.setItem(
      "holidays",
      JSON.stringify(updated)
    );

setHolidayList(updated);

onHolidayChange();

onClose();
  };

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">

      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">

        <div className="flex items-center justify-between border-b px-6 py-5">

          <div>

            <h2 className="text-xl font-bold">
              Attendance Details
            </h2>

            <p className="text-sm text-slate-500">

              {date.toLocaleDateString(
                "en-GB",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}

            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={22} />
          </button>

        </div>
                <div className="space-y-6 p-6">

          {holiday && (

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                Holiday
              </div>

              <h3 className="text-lg font-bold text-amber-800">
                {holiday.name}
              </h3>

            </div>

          )}

          {record ? (

            <>
              <div className="grid gap-4 md:grid-cols-2">

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Login Time
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {record.loginTime || "--"}
                  </p>

                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">

                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Logout Time
                  </p>

                  <p className="mt-2 text-2xl font-bold text-rose-700">
                    {record.logoutTime || "--"}
                  </p>

                </div>

              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Total Services
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {totalServices}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Department Fee
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    ₹{departmentFee.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Service Charge
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    ₹{serviceCharge.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Total Amount
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    ₹{totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Cash
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    ₹{Number(record.cashAmount || 0).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    GPay / UPI
                  </p>
                  <p className="mt-1 text-xl font-bold text-indigo-700">
                    ₹{Number(record.gpayUpiAmount || 0).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Commission
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">
                    ₹{Number(record.commission || 0).toFixed(2)}
                  </p>
                </div>

              </div>

            </>

          ) : (
                        <div className="space-y-5">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">

                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                  <span className="text-2xl">📅</span>
                </div>

                <h3 className="text-lg font-bold text-slate-700">
                  No Attendance Record
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  No login or logout record was found for this date.
                </p>

                <div className="mt-5 inline-flex rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                  Status : Absent
                </div>

              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                <div className="mb-4 flex items-center justify-between">

                  <h3 className="text-lg font-bold text-amber-800">
                    Holiday Management
                  </h3>

                  {holiday && (
                    <button
                      onClick={deleteHoliday}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  )}

                </div>

                <input
                  type="text"
                  value={holidayName}
                  onChange={(e) =>
                    setHolidayName(e.target.value)
                  }
                  placeholder="Holiday name (Eg: Eid, Onam, Christmas)"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-amber-500"
                />

                <button
                  onClick={saveHoliday}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  {editing ? (
                    <>
                      <Pencil size={16} />
                      Update Holiday
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add Holiday
                    </>
                  )}
                </button>

              </div>

            </div>

          )}

        </div>

        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-6 py-4">

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>

        </div>

      </div>

    </div>

  );

}