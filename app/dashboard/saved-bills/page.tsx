"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, RefreshCw, ChevronDown, 
  User, Clock, Smartphone, Calendar 
} from 'lucide-react';

interface SavedBill {
  id: string;
  customerName: string;
  mobile: string;
  date: string;
  staffName: string;
  pendingCount: string;
  amount: number;
}

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const dateKey = (value: string) => {
  const match = value.match(/(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

export default function SavedBillsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday);
  const [savedBills, setSavedBills] = useState<SavedBill[]>([]);

  // LocalStorage-ൽ നിന്ന് ഡാറ്റ എടുക്കുന്ന ഫങ്ക്ഷൻ (Role-based filtering ഉൾപ്പെടുത്തി)
  const fetchBills = () => {
    if (typeof window !== 'undefined') {
      // നിലവിൽ ലോഗിൻ ചെയ്ത യൂസറെ കണ്ടെത്തുക
      const storedUser = localStorage.getItem('loggedInUser');
      const currentUser = storedUser ? JSON.parse(storedUser) : { username: 'Admin User', role: 'admin' };

      // Service Entry saves drafts in savedBillsList.
      // Keep savedBills as a legacy fallback so older data is still visible.
      const data =
        localStorage.getItem('savedBillsList') ||
        localStorage.getItem('savedBills');

      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            let billsList = parsed.map((item: any, index: number) => {
              const totalAmount = Number(
                item.totalAmount ??
                item.amount ??
                item.total ??
                0
              ) || 0;

              const balance = Number(
                item.balance ??
                item.pendingAmount ??
                item.owedAmount ??
                0
              ) || 0;

              return {
                id: item.id || item.billId || `bill-${index}-${Date.now()}`,
                customerName: item.customerName || item.name || 'Customer',
                mobile: item.mobile || item.customerPhone || item.mobileNumber || 'N/A',
                date: item.date || item.dateTime || item.createdAt || new Date().toLocaleDateString(),
                staffName: item.staffName || item.staff || 'Admin User',
                pendingCount: item.pendingCount || (balance > 0 ? 'Pending' : 'Ready to Complete'),
                amount: totalAmount,
              };
            });

            // അഡ്മിൻ അല്ലെങ്കില്‍, സ്റ്റാഫിന്റെ പേര് വെച്ച് മാത്രം ഫിൽട്ടർ ചെയ്യുക
            if (currentUser.role.toLowerCase() !== 'admin') {
              billsList = billsList.filter(
                (bill: SavedBill) => bill.staffName.toLowerCase() === currentUser.username.toLowerCase()
              );
            }

            setSavedBills(billsList);
          } else {
            setSavedBills([]);
          }
        } catch (e) {
          console.error("Error parsing saved bills", e);
          setSavedBills([]);
        }
      } else {
        setSavedBills([]);
      }
    }
  };

  // പേജ് ലോഡ് ആകുമ്പോൾ ഡാറ്റ ഫെച്ച് ചെയ്യുന്നു
  useEffect(() => {
    fetchBills();
  }, []);

  // റിഫ്രഷ് ബട്ടൺ ലോജിക്
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchBills();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // ഫിൽറ്റർ ലോജിക്
  const filteredBills = savedBills.filter(bill => {
    const matchesSearch =
      bill.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.mobile.includes(searchQuery) ||
      bill.staffName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && (!selectedDate || dateKey(bill.date) === selectedDate);
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
      
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white rounded-2xl p-8 shadow-md flex justify-between items-center">
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight">Saved Bills</h3>
          <p className="text-xs text-purple-100 font-medium tracking-wide mt-1.5 opacity-90">
            Bills waiting for final processing
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold text-xs transition active:scale-95 cursor-pointer"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pt-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 tracking-tight">Pending Bills</span>
          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-black rounded-md">
            {filteredBills.length}
          </span>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
            <Calendar size={14} />
            <span className="sr-only">Saved bills date</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-xs text-slate-600 outline-none" />
          </label>
          <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search customer, mobile..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-violet-500 shadow-sm transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredBills.length > 0 ? (
          filteredBills.map((bill) => (
            <div 
              key={bill.id}
              className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-violet-200 transition duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm uppercase shadow-inner shrink-0">
                  {bill.customerName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base capitalize tracking-tight">{bill.customerName}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-semibold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Smartphone size={12} className="text-slate-300" /> {bill.mobile}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-300" /> {bill.date}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wide">
                      {bill.staffName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100">
                  {bill.pendingCount}
                </span>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => router.push(`/dashboard/service-entry?resume=${bill.id}`)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    Complete Bill
                  </button>

                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 py-1.5 pl-3 pr-1.5 rounded-xl text-slate-700">
                    <span className="text-xs font-black">₹{bill.amount.toLocaleString('en-IN')}.00</span>
                    <button className="p-0.5 text-slate-400 hover:text-slate-600 transition">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
            <Clock size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold">No pending draft bills found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
