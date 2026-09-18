"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { PerformanceRecord, Holiday } from "../types";

interface AttendanceCalendarProps {
  records: PerformanceRecord[];
  holidays: Holiday[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDateClick: (date: Date) => void;
  selectedStaff: string;
}

export default function AttendanceCalendar({
  records,
  holidays,
  currentMonth,
  onMonthChange,
  onDateClick,
  selectedStaff,
}: AttendanceCalendarProps) {
  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const years = Array.from(
    { length: 11 },
    (_, i) => today.getFullYear() - 5 + i
  );

  const dateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  const staffMatches = (staffName?: string) =>
    selectedStaff === "All" ||
    String(staffName || "").trim().toLowerCase() === selectedStaff.trim().toLowerCase();

  const hasAttendance = (date: Date) => {
    const key = dateKey(date);
    return records.find(
      (record) => record.date === key && staffMatches(record.staffName)
    );
  };

  const isHoliday = (date: Date) => {
    const key = dateKey(date);
    return holidays.find((holiday) => holiday.date === key);
  };

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  const attendanceSummary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let holiday = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      if (date > today) continue;

      if (date.getDay() === 0 || isHoliday(date)) {
        holiday++;
      } else if (hasAttendance(date)) {
        present++;
      } else {
        absent++;
      }
    }

    return { present, absent, holiday };
  }, [records, holidays, selectedStaff, month, year]);

  const previousMonth = () => onMonthChange(new Date(year, month - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));

  const goToCurrentMonth = () => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div className="space-y-3">
      {/* Compact calendar toolbar — keeps the existing theme/colors */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => onMonthChange(new Date(year, Number(e.target.value), 1))}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
            >
              {monthNames.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => onMonthChange(new Date(Number(e.target.value), month, 1))}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
            >
              {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
            </select>

            <button
              type="button"
              onClick={goToCurrentMonth}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              <RefreshCw size={14} />
              Load
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={previousMonth}
              aria-label="Previous month"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-indigo-500 transition hover:bg-indigo-50"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[145px] text-center text-sm font-bold text-slate-700">
              {monthNames[month]} {year}
            </div>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-indigo-500 transition hover:bg-indigo-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-emerald-300 bg-emerald-100" />Present &amp; Closed</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-orange-300 bg-orange-100" />Present &amp; Open</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-rose-300 bg-rose-100" />Absent</div>
          <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-slate-300 bg-slate-50" />Future</div>
          <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">
            Present {attendanceSummary.present} · Absent {attendanceSummary.absent} · Holiday {attendanceSummary.holiday}
          </span>
        </div>
      </div>

      {/* Calendar — compact enough to fit while keeping all daily data readable */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
            <div
              key={day}
              className="border-r border-slate-200 py-2 text-center text-[11px] font-bold tracking-wide text-slate-500 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={index} className="min-h-[92px] border border-slate-100 bg-slate-50" />;
            }

            const attendance = hasAttendance(date);
            const holiday = isHoliday(date);
            const isSunday = date.getDay() === 0;
            const isToday = today.toDateString() === date.toDateString();
            const isFuture = date > today;

            let bgClass = "bg-white hover:bg-slate-50";
            if (attendance) bgClass = "bg-orange-50 hover:bg-orange-100";
            if (holiday || isSunday) bgClass = "bg-rose-100 hover:bg-rose-200";
            if (isFuture) bgClass = "bg-slate-50";

            return (
              <div
                key={date.toISOString()}
                onClick={() => onDateClick(date)}
                className={`min-h-[92px] cursor-pointer border border-slate-100 p-2 transition ${bgClass} ${isToday ? "ring-2 ring-inset ring-indigo-500" : ""}`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-1">
                  <span className={`text-sm font-bold ${isToday ? "text-indigo-600" : "text-slate-700"}`}>
                    {date.getDate()}
                  </span>
                  {isToday && (
                    <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Today</span>
                  )}
                </div>

                {holiday ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase text-rose-600">Holiday</div>
                    <div className="truncate text-[11px] font-medium text-rose-700" title={holiday.name}>{holiday.name}</div>
                  </div>
                ) : isSunday ? (
                  <div className="flex h-[58px] items-center justify-center">
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-600">Sunday</span>
                  </div>
                ) : attendance ? (
                  <div className="space-y-1">
                    <div className="inline-flex rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700">
                      Present{attendance.logoutTime && attendance.logoutTime !== "--" ? " & Closed" : " & Open"}
                    </div>
                    <div className="text-[10px] font-medium leading-tight text-slate-600">
                      Dept: ₹{Number(attendance.departmentFee || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-medium leading-tight text-slate-600">
                      Svc: ₹{Number(attendance.serviceCharge || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-medium leading-tight text-slate-600">
                      Svc#: {Number(attendance.totalServices || 0)}
                    </div>
                  </div>
                ) : isFuture ? (
                  <div className="flex h-[58px] items-center justify-center">
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">Future</span>
                  </div>
                ) : (
                  <div className="flex h-[58px] items-center justify-center">
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold text-rose-600">Absent</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
