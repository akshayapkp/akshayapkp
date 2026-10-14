"use client";

import React from "react";
import { FileText } from "lucide-react";

import { PendingBill } from "../types";

interface PendingBillsProps {
  bills: PendingBill[];
  selectedStaff: string;
  searchQuery: string;
}

export default function PendingBills({
  bills,
  selectedStaff,
  searchQuery,
}: PendingBillsProps) {

  const filteredPendingBills = bills.filter(
    (bill) => {

      const normalizeStaff = (name?: string) =>
        String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
      const matchesStaff =
        selectedStaff === "All" ||
        normalizeStaff(bill.staffName) === normalizeStaff(selectedStaff);

      const matchesSearch =
        bill.customerName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        bill.phone
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      return matchesStaff && matchesSearch;
    }
  );

  if (filteredPendingBills.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

        <div className="text-center py-12 text-slate-400">

          <FileText
            size={40}
            className="mx-auto mb-2 opacity-40"
          />

          <p className="text-sm font-semibold">
            No pending bills found.
          </p>

        </div>

      </div>
    );
  }

  return (

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

              <th className="py-3 px-4">
                Phone
              </th>

              <th className="py-3 px-4 text-right">
                Amount
              </th>

              <th className="py-3 px-4 text-center">
                Status
              </th>

            </tr>

          </thead>

          <tbody className="divide-y divide-slate-100">
                        {filteredPendingBills.map((bill) => (

              <tr
                key={bill.id}
                className="hover:bg-slate-50/80 transition text-slate-700"
              >

                <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                  {new Date(
                    bill.timestamp
                  ).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>

                <td className="py-3.5 px-4 font-bold text-indigo-600">

                  <span className="bg-indigo-50 px-2.5 py-1 rounded-lg text-xs">
                    {bill.staffName || "Admin User"}
                  </span>

                </td>

                <td className="py-3.5 px-4 font-medium">
                  {bill.customerName || "Customer"}
                </td>

                <td className="py-3.5 px-4 text-xs font-mono">
                  {bill.phone || "N/A"}
                </td>

                <td className="py-3.5 px-4 text-right font-black text-slate-900">
                  ₹
                  {Number(
                    bill.totalAmount || 0
                  ).toFixed(2)}
                </td>

                <td className="py-3.5 px-4 text-center">

                  <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                    Pending
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );
}