"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Search, Users } from "lucide-react";
import { PerformanceRecord } from "../types";
import jsPDF from "jspdf";

interface ReportProps {
  records: PerformanceRecord[];
  attendanceRecords: PerformanceRecord[];
  selectedStaff: string;
}

const dateKey = (value: string) => {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const indian = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (indian) return `${indian[3]}-${String(Number(indian[2])).padStart(2, "0")}-${String(Number(indian[1])).padStart(2, "0")}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function StaffPerformanceReport({
  records,
  attendanceRecords,
  selectedStaff,
}: ReportProps) {
  const now = new Date();
  const initialTo = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const initialFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const [fromDate, setFromDate] = useState(toInput(initialFrom));
  const [toDate, setToDate] = useState(toInput(initialTo));
  const [appliedFrom, setAppliedFrom] = useState(fromDate);
  const [appliedTo, setAppliedTo] = useState(toDate);

  const reportRows = useMemo(() => {
    const start = appliedFrom;
    const end = appliedTo;
    return records.filter((r) => {
      const key = dateKey(r.date || r.timestamp);
      const staff = String(r.staffName || "").trim().toLowerCase();
      const wanted = String(selectedStaff || "All").trim().toLowerCase();
      return key && key >= start && key <= end && (wanted === "all" || staff === wanted);
    });
  }, [records, selectedStaff, appliedFrom, appliedTo]);

  const daily = useMemo(() => {
    const map = new Map<string, { services:number; dept:number; charge:number; upi:number; cash:number }>();
    reportRows.forEach((r) => {
      const key = dateKey(r.date || r.timestamp);
      const x = map.get(key) || { services: 0, dept: 0, charge: 0, upi: 0, cash: 0 };
      x.services += Number(r.totalServices || 0);
      x.dept += Number(r.departmentFee || 0);
      x.charge += Number(r.serviceCharge || 0);
      x.upi += Number(r.gpayUpiAmount || 0);
      x.cash += Number(r.cashAmount || 0);
      map.set(key, x);
    });
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  }, [reportRows]);

  const totals = useMemo(() => ({
    services: reportRows.reduce((s,r)=>s+Number(r.totalServices||0),0),
    dept: reportRows.reduce((s,r)=>s+Number(r.departmentFee||0),0),
    charge: reportRows.reduce((s,r)=>s+Number(r.serviceCharge||0),0),
    upi: reportRows.reduce((s,r)=>s+Number(r.gpayUpiAmount||0),0),
    cash: reportRows.reduce((s,r)=>s+Number(r.cashAmount||0),0),
    bills: new Set(reportRows.map(r=>String(r.id || `${r.staffName}|${r.date}|${r.customerName}`))).size,
  }), [reportRows]);

  const presentDays = useMemo(() => {
    const wanted = String(selectedStaff || "All").trim().toLowerCase();
    return new Set(attendanceRecords.filter(r => {
      const key = dateKey(r.date || r.timestamp);
      const staff = String(r.staffName || "").trim().toLowerCase();
      return key >= appliedFrom && key <= appliedTo && (wanted === "all" || staff === wanted);
    }).map(r=>dateKey(r.date || r.timestamp))).size;
  }, [attendanceRecords, selectedStaff, appliedFrom, appliedTo]);

  const workingDays = useMemo(() => {
    const start = new Date(`${appliedFrom}T00:00:00`);
    const end = new Date(`${appliedTo}T00:00:00`);
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (d.getDay() !== 0) count++;
    }
    return count;
  }, [appliedFrom, appliedTo]);

  const attendancePercent = workingDays ? Math.round((presentDays / workingDays) * 100) : 0;

  const monthLabel = new Date(`${appliedFrom}T00:00:00`).toLocaleString("en-IN", { month:"long", year:"numeric" });

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 18;

    const addPageIfNeeded = (height = 8) => {
      if (y + height > pageHeight - 14) {
        doc.addPage();
        y = 18;
      }
    };

    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 13, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Staff Performance Report", margin, 9);
    doc.setFontSize(9);
    doc.text(
      selectedStaff === "All" ? "All Staff Members" : selectedStaff,
      pageWidth - margin,
      9,
      { align: "right" }
    );

    y = 22;
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(
      `Period: ${new Date(`${appliedFrom}T00:00:00`).toLocaleDateString("en-GB")} - ${new Date(`${appliedTo}T00:00:00`).toLocaleDateString("en-GB")}`,
      margin,
      y
    );
    y += 9;

    const summary = [
      ["Total Services", String(totals.services)],
      ["Department Fee", money(totals.dept)],
      ["Service Charge", money(totals.charge)],
      ["UPI / GPAY", money(totals.upi)],
      ["Cash", money(totals.cash)],
      ["Total Bills", String(totals.bills)],
      ["Days Present", String(presentDays)],
      ["Days Absent", String(Math.max(
    Math.floor((new Date(`${appliedTo}T00:00:00`).getTime() - new Date(`${appliedFrom}T00:00:00`).getTime()) / 86400000) + 1 - presentDays,
    0
  ))],
      ["Attendance", `${attendancePercent}%`],
    ];

    doc.setFontSize(9);
    const boxW = (pageWidth - margin * 2 - 6) / 2;
    summary.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + col * (boxW + 6);
      const yy = y + row * 14;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(224, 231, 239);
      doc.roundedRect(x, yy - 5, boxW, 11, 2, 2, "FD");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 4, yy);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + boxW - 4, yy, { align: "right" });
    });
    y += 64;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Daily Performance Breakdown", margin, y);
    y += 7;

    const columns = [
      { title: "DATE", x: margin, w: 30 },
      { title: "SERVICES", x: margin + 30, w: 22 },
      { title: "DEPT FEE", x: margin + 52, w: 31 },
      { title: "SVC CHARGE", x: margin + 83, w: 31 },
      { title: "UPI", x: margin + 114, w: 30 },
      { title: "CASH", x: margin + 144, w: 38 },
    ];

    const drawHeader = () => {
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(199, 210, 254);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "FD");
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      columns.forEach((col) => doc.text(col.title, col.x + 2, y));
      y += 8;
    };

    drawHeader();
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");

    daily.forEach(([date, row]) => {
      addPageIfNeeded(9);
      if (y === 18) drawHeader();
      doc.setTextColor(51, 65, 85);
      const values = [
        new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        String(row.services),
        money(row.dept),
        money(row.charge),
        money(row.upi),
        money(row.cash),
      ];
      columns.forEach((col, i) => doc.text(values[i], col.x + 2, y));
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 7;
    });

    addPageIfNeeded(16);
    y += 3;
    doc.setFillColor(238, 242, 255);
    doc.rect(margin, y - 5, pageWidth - margin * 2, 10, "F");
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const totalValues = [
      "TOTAL",
      String(totals.services),
      money(totals.dept),
      money(totals.charge),
      money(totals.upi),
      money(totals.cash),
    ];
    columns.forEach((col, i) => doc.text(totalValues[i], col.x + 2, y));
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Generated on ${new Date().toLocaleString("en-IN")}`,
      margin,
      pageHeight - 8
    );

    doc.save(`staff-performance-${appliedFrom}-to-${appliedTo}.pdf`);
  };

  return (
    <div className="space-y-4 text-slate-700">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #staff-performance-report, #staff-performance-report * { visibility: visible !important; }
          #staff-performance-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div id="staff-performance-report" className="space-y-5">
        <div className="rounded-2xl border border-indigo-100 bg-white/80 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-slate-600">
              <span><CalendarDays className="mr-1 inline h-4 w-4 text-indigo-500" />From Date</span>
              <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="h-10 rounded-xl border border-indigo-100 bg-white px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-black uppercase tracking-wide text-slate-600">
              <span><CalendarDays className="mr-1 inline h-4 w-4 text-indigo-500" />To Date</span>
              <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="h-10 rounded-xl border border-indigo-100 bg-white px-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10" />
            </label>
            <button type="button" onClick={()=>{setAppliedFrom(fromDate);setAppliedTo(toDate)}} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-500/20">
              <Search size={16}/> Fetch Report
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[270px_repeat(5,minmax(0,1fr))] lg:items-center">
            <div className="border-r border-slate-200 pr-5">
              <div className="flex items-center gap-2 text-lg font-black text-slate-800"><Users size={18} className="text-indigo-500"/> My Performance</div>
              <p className="text-sm text-slate-500">{new Date(`${appliedFrom}T00:00:00`).toLocaleDateString("en-GB")} — {new Date(`${appliedTo}T00:00:00`).toLocaleDateString("en-GB")}</p>
              <div className="mt-1 text-4xl font-black text-slate-900">{totals.services}</div>
              <p className="text-sm text-slate-400">Total Services</p>
            </div>
            <div><p className="text-xs font-black uppercase text-slate-500">Department Fee</p><p className="text-lg font-black">{money(totals.dept)}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-500">Service Charge</p><p className="text-lg font-black">{money(totals.charge)}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-500">UPI / GPAY</p><p className="text-lg font-black">{money(totals.upi)}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-500">Cash</p><p className="text-lg font-black">{money(totals.cash)}</p></div>
            <div><p className="text-xs font-black uppercase text-slate-500">Total Bills</p><p className="text-lg font-black">{totals.bills}</p></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 font-bold"><span className="text-indigo-600">{totals.bills}</span> Bills</div>
          <div className="rounded-xl border border-indigo-100 bg-white px-4 py-2 font-bold"><span className="text-indigo-600">{presentDays}</span> Days Present</div>
        </div>

        <button type="button" onClick={downloadPdf} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-500/20">
          <Download size={16}/> Download My Report PDF
        </button>

        <div className="rounded-2xl border border-indigo-100 bg-white/80 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-black text-slate-700"><CalendarDays size={18} className="text-indigo-500"/> Attendance in Range</h3>
          <div className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-indigo-100 bg-white p-3 text-center"><b className="block text-2xl text-emerald-500">{presentDays}</b><span className="text-xs font-bold text-slate-500">PRESENT</span></div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3 text-center"><b className="block text-2xl text-indigo-500">{workingDays}</b><span className="text-xs font-bold text-slate-500">WORKING DAYS</span></div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3 text-center"><b className="block text-2xl text-rose-500">{Math.max(
    Math.floor((new Date(`${appliedTo}T00:00:00`).getTime() - new Date(`${appliedFrom}T00:00:00`).getTime()) / 86400000) + 1 - presentDays,
    0
  )}</b><span className="text-xs font-bold text-slate-500">ABSENT</span></div>
            <div className="rounded-xl border border-indigo-100 bg-white p-3 text-center"><b className="block text-2xl text-indigo-500">{attendancePercent}%</b><span className="text-xs font-bold text-slate-500">ATTENDANCE %</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-white/80 p-5">
          <h3 className="mb-3 font-black text-slate-700">{monthLabel}</h3>
          <div className="overflow-hidden rounded-xl border border-indigo-100">
            <div className="grid grid-cols-7 bg-indigo-50 text-center text-xs font-black text-slate-500">{["SUN","MON","TUE","WED","THU","FRI","SAT"].map(x=><div key={x} className="p-2">{x}</div>)}</div>
            <div className="grid grid-cols-7">
              {(() => {
                const d=new Date(`${appliedFrom}T00:00:00`); const first=new Date(d.getFullYear(),d.getMonth(),1); const days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
                const cells: React.ReactNode[] = [];
                for(let i=0;i<first.getDay();i++) cells.push(<div key={`e${i}`} className="min-h-10 border-t border-indigo-50 bg-slate-50/50"/>);
                for(let n=1;n<=days;n++){const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(n).padStart(2,"0")}`; const has=daily.some(([dk])=>dk===k); cells.push(<div key={k} className={`min-h-10 border-t border-indigo-50 p-2 text-xs font-bold ${has?"bg-amber-100":"bg-white"}`}>{n}</div>);}
                return cells;
              })()}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 flex items-center gap-2 font-black text-slate-700"><FileText size={18} className="text-indigo-500"/> Daily Performance Breakdown</h3>
          <div className="overflow-x-auto rounded-xl border border-indigo-100">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-indigo-50"><tr>{["DATE","SERVICES","DEPT FEE","SVC CHARGE","UPI","CASH"].map(h=><th key={h} className="px-3 py-2 text-left text-xs font-black text-slate-500">{h}</th>)}</tr></thead>
              <tbody>
                {daily.map(([k,x])=><tr key={k} className="border-t border-indigo-50"><td className="px-3 py-2 font-semibold">{new Date(`${k}T00:00:00`).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td><td className="px-3 py-2">{x.services}</td><td className="px-3 py-2">{money(x.dept)}</td><td className="px-3 py-2">{money(x.charge)}</td><td className="px-3 py-2">{money(x.upi)}</td><td className="px-3 py-2">{money(x.cash)}</td></tr>)}
                <tr className="border-t-2 border-indigo-200 bg-indigo-50 font-black"><td className="px-3 py-2">TOTAL</td><td className="px-3 py-2">{totals.services}</td><td className="px-3 py-2">{money(totals.dept)}</td><td className="px-3 py-2">{money(totals.charge)}</td><td className="px-3 py-2">{money(totals.upi)}</td><td className="px-3 py-2">{money(totals.cash)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
