"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, Search, Calendar, RefreshCw, Download, 
  User, Phone, ChevronDown, CheckCircle2, AlertCircle 
} from 'lucide-react';

interface CreditBill {
  id: string;
  billNumber?: string;
  customerName: string;
  mobileNumber: string;
  date: string;
  staffName: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  owedAmount: number;
}

export default function CreditDetailsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<CreditBill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Role-based filtering ഉൾപ്പെടുത്തിയ useEffect
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedInUser');
    const currentUser = storedUser ? JSON.parse(storedUser) : { username: 'Admin User', role: 'admin' };

    const savedBills = localStorage.getItem('smart_akshaya_bills');
    if (savedBills) {
      const parsed = JSON.parse(savedBills);
      let creditOnly = parsed.filter((b: any) => Number(b.owedAmount || 0) > 0);

      // അഡ്മിൻ അല്ലെങ്കിൽ സ്റ്റാഫിന്റെ പേര് മാത്രം ഫിൽട്ടർ ചെയ്യുക[cite: 2]
      if (currentUser.role.toLowerCase() !== 'admin') {
        creditOnly = creditOnly.filter(
          (b: any) => (b.staffName || '').toLowerCase() === currentUser.username.toLowerCase()
        );
      }

      setBills(creditOnly);
    } else {
      const defaultData: CreditBill[] = [

      ];

      let filteredDefault = defaultData;
      if (currentUser.role.toLowerCase() !== 'admin') {
        filteredDefault = defaultData.filter(
          (b) => b.staffName.toLowerCase() === currentUser.username.toLowerCase()
        );
      }

      setBills(filteredDefault);
      localStorage.setItem('smart_akshaya_bills', JSON.stringify(defaultData));
    }
  }, []);

  // Filter Logic
  const filteredBills = bills.filter((bill) => {
    const matchesSearch = 
      bill.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.mobileNumber.includes(searchQuery) ||
      bill.staffName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDate = 
      (!startDate || bill.date >= startDate) &&
      (!endDate || bill.date <= endDate);

    return matchesSearch && matchesDate;
  });

  const totalBalanceOwed = filteredBills.reduce((acc, b) => acc + b.owedAmount, 0);
  const uniqueCustomers = new Set(filteredBills.map(b => b.customerName.toLowerCase())).size;
  const totalCreditBookings = filteredBills.length;

  const handleSettleBill = (bill: CreditBill) => {
    router.push(`/dashboard/service-entry?resume=${bill.id}`);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1500px] space-y-5 bg-gradient-to-br from-slate-50 via-white to-rose-50/30 p-4 font-sans sm:p-5 lg:p-6">
      
      {/* Header Banner */}
      <div className="relative mb-5 overflow-hidden rounded-[30px] border border-rose-400/20 bg-gradient-to-br from-slate-950 via-rose-950 to-indigo-950 p-6 text-white shadow-[0_22px_55px_rgba(15,23,42,0.2)] sm:p-7">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-xl">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Credit Details</h1>
              <p className="text-xs font-medium text-rose-100/75 sm:text-sm">All staff credit & partial-payment bills</p>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-white/15 backdrop-blur-md px-6 py-3 rounded-2xl text-right border border-white/20 flex-1 md:flex-initial">
              <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">Balance Owed</p>
              <p className="text-xl font-extrabold">₹ {totalBalanceOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md px-6 py-3 rounded-2xl text-center border border-white/20 min-w-[100px]">
              <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">Bookings</p>
              <p className="text-xl font-extrabold">{totalCreditBookings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Balance Owed</p>
            <h3 className="text-2xl font-black text-slate-800">₹ {totalBalanceOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-red-500 font-bold text-lg">₹</div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unique Customers</p>
            <h3 className="text-2xl font-black text-slate-800">{uniqueCustomers}</h3>
            <p className="text-xs text-slate-400 font-medium">with pending balance</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-500">
            <User size={22} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Credit Bookings</p>
            <h3 className="text-2xl font-black text-slate-800">{totalCreditBookings}</h3>
            <p className="text-xs text-slate-400 font-medium">unpaid / partial</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
            <CreditCard size={22} />
          </div>
        </div>
      </div>

      {/* Filter & Main Card Area */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-slate-800">Credit & Partial Bills</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
              title="Reset Filters"
            >
              <RefreshCw size={18} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition">
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search customer, mobile, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
          </div>

          <div className="relative">
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="relative">
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex gap-2">
            <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none">
              <option>Presets</option>
            </select>
            <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none">
              <option>All Staff</option>
            </select>
          </div>
        </div>

        {/* Bill List */}
        <div className="space-y-3">
          {filteredBills.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-medium">
              No credit bills found.
            </div>
          ) : (
            filteredBills.map((bill) => (
              <div 
                key={bill.id}
                className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_25px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-sm font-black uppercase text-white shadow-lg shadow-rose-500/20">
                    {bill.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{bill.customerName}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1"><Phone size={12} /> {bill.mobileNumber}</span>
                      <span>•</span>
                      <span>{bill.date}</span>
                      <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{bill.staffName}</span>
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">{bill.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-0 pt-3 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">OWED</span>
                    <span className="text-base font-black text-red-500">₹{bill.owedAmount.toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={() => handleSettleBill(bill)}
                    className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Settle Bill
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}