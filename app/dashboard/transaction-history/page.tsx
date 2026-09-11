"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { Search, RotateCcw, ArrowUpRight, ArrowDownLeft, Calendar, RefreshCw, Trash2 } from 'lucide-react';

interface TransactionItem {
  id: string;
  dateTime: string; // e.g., "10-07-2026 12:40" or ISO format
  walletName: string;
  type: 'IN' | 'OUT' | 'UPDATE';
  amount: number;
  balanceAfter: number;
  description: string;
  staffName: string;
  billId?: string;
}

function TransactionHistoryContent() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState(getToday);
  const [toDate, setToDate] = useState(getToday);
  const [isMounted, setIsMounted] = useState(false);
  const [currentStaff, setCurrentStaff] = useState('');
  const [currentRole, setCurrentRole] = useState('');

  // LocalStorage-ൽ നിന്ന് ഇടപാടുകൾ ലോഡ് ചെയ്യുക
  const loadTransactions = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('walletTransactions');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const savedBills = JSON.parse(localStorage.getItem('savedBillsList') || '[]');
            const creditBills = JSON.parse(localStorage.getItem('smart_akshaya_bills') || '[]');
            const allBills = [...savedBills, ...creditBills];

            const normalized = parsed.map((tx: any) => {
              const dateTime = tx.dateTime || tx.date || tx.timestamp || tx.createdAt || '';
              let billId = tx.billId || tx.billNumber || '';

              if (!billId) {
                const description = String(tx.description || '').toLowerCase();
                const matchedBill = allBills.find((bill: any) => {
                  const customer = String(bill.customerName || '').toLowerCase();
                  if (customer && description.includes(customer)) return true;
                  return Array.isArray(bill.items) && bill.items.some((item: any) =>
                    String(item.name || '').toLowerCase() &&
                    description.includes(String(item.name || '').toLowerCase())
                  );
                });
                billId = matchedBill?.billId || matchedBill?.billNumber || matchedBill?.id || '';
              }

              return {
                ...tx,
                dateTime,
                billId,
                staffName: tx.staffName || tx.staff || 'Admin'
              };
            });

            // Older credit bills were saved in smart_akshaya_bills but did not
            // always create a walletTransactions record. Rebuild the missing
            // credit history entries from the credit-bill source of truth.
            const creditTransactions: TransactionItem[] = creditBills
              .filter((bill: any) => Number(bill.owedAmount ?? 0) > 0)
              .map((bill: any) => {
                const creditBillId = String(
                  bill.billId || bill.billNumber || bill.id || ''
                );
                const creditDateTime =
                  bill.dateTime ||
                  bill.date ||
                  new Date().toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });

                return {
                  id: `TX-CREDIT-${creditBillId}`,
                  walletId: 'CREDIT',
                  walletName: 'Customer Credit',
                  type: 'UPDATE',
                  amount: Number(bill.owedAmount || bill.totalAmount || 0),
                  balanceAfter: Number(bill.owedAmount || 0),
                  description: `Credit Bill: ${bill.customerName || 'Walk-in'}`,
                  dateTime: creditDateTime,
                  staffName: bill.staffName || 'Admin',
                  billId: creditBillId,
                };
              })
              .filter((tx: TransactionItem) => tx.billId);

            const existingCreditBillIds = new Set(
              normalized
                .filter(
                  (tx: any) =>
                    String(tx.walletName || '').toLowerCase() === 'customer credit' ||
                    String(tx.description || '').toLowerCase().startsWith('credit bill:')
                )
                .map((tx: any) => String(tx.billId || ''))
                .filter(Boolean)
            );

            const missingCreditTransactions = creditTransactions.filter(
              (tx) => !existingCreditBillIds.has(String(tx.billId || ''))
            );

            const mergedTransactions = [
              ...missingCreditTransactions,
              ...normalized,
            ];

            localStorage.setItem(
              'walletTransactions',
              JSON.stringify(mergedTransactions)
            );
            setTransactions(mergedTransactions);
            return;
          }
        } catch (e) {
          console.error("Failed to parse transactions", e);
        }
      } else {
        const creditBills = JSON.parse(
          localStorage.getItem('smart_akshaya_bills') || '[]'
        );

        const recoveredCreditTransactions: TransactionItem[] = creditBills
          .filter((bill: any) => Number(bill.owedAmount ?? 0) > 0)
          .map((bill: any) => {
            const creditBillId = String(
              bill.billId || bill.billNumber || bill.id || ''
            );
            return {
              id: `TX-CREDIT-${creditBillId}`,
              walletId: 'CREDIT',
              walletName: 'Customer Credit',
              type: 'UPDATE',
              amount: Number(bill.owedAmount || bill.totalAmount || 0),
              balanceAfter: Number(bill.owedAmount || 0),
              description: `Credit Bill: ${bill.customerName || 'Walk-in'}`,
              dateTime:
                bill.dateTime ||
                bill.date ||
                new Date().toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                }),
              staffName: bill.staffName || 'Admin',
              billId: creditBillId,
            };
          })
          .filter((tx: TransactionItem) => tx.billId);

        if (recoveredCreditTransactions.length > 0) {
          localStorage.setItem(
            'walletTransactions',
            JSON.stringify(recoveredCreditTransactions)
          );
          setTransactions(recoveredCreditTransactions);
        } else {
          setTransactions([]);
        }
      }
    }
  };

  // പഴയ എല്ലാ ഹിസ്റ്ററിയും ക്ലിയർ ചെയ്യാനുള്ള ഫങ്ഷൻ
  const clearAllHistory = () => {
    if (window.confirm("നിങ്ങൾക്ക് പഴയ എല്ലാ ട്രാൻസാക്ഷൻ ഹിസ്റ്ററിയും മായ്ച്ചു കളയണമോ?")) {
      localStorage.removeItem('walletTransactions');
      setTransactions([]);
    }
  };

  useEffect(() => {
    setIsMounted(true);

    try {
      const storedUser = localStorage.getItem('loggedInUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentStaff(String(parsedUser.username || parsedUser.name || ''));
        setCurrentRole(String(parsedUser.role || '').toLowerCase());
      }
    } catch (error) {
      console.error('Failed to read loggedInUser', error);
    }

    loadTransactions();
  }, []);

  // Search & Date Filter Logic
  const filteredTransactions = transactions.filter((tx) => {
    const query = searchQuery.toLowerCase();

    const normalizedRole = String(currentRole || '').trim().toLowerCase();
    const normalizedStaff = String(currentStaff || '').trim().toLowerCase();
    const isAdmin =
      normalizedRole.includes('admin') ||
      normalizedStaff === 'admin' ||
      normalizedStaff === 'admin user';

    const matchesStaff = isAdmin
      ? true
      : normalizedStaff !== '' &&
        String(tx.staffName || '').trim().toLowerCase() === normalizedStaff;

    if (!matchesStaff) return false;
    
    // Null-safe String Search
    const matchesSearch = 
      (tx.walletName || '').toLowerCase().includes(query) ||
      (tx.description || '').toLowerCase().includes(query) ||
      (tx.staffName || '').toLowerCase().includes(query) ||
      (tx.billId || '').toLowerCase().includes(query);

    let matchesDate = true;

    if (fromDate || toDate) {
      try {
        // Date String parsing guard
        const datePart = tx.dateTime ? tx.dateTime.split(' ')[0] : '';
        if (datePart) {
          const dateComponents = datePart.includes('-') ? datePart.split('-') : datePart.split('/');
          
          let year = 0, month = 0, day = 0;
          if (dateComponents[0].length === 4) {
            // YYYY-MM-DD
            [year, month, day] = dateComponents.map(Number);
          } else {
            // DD-MM-YYYY
            [day, month, year] = dateComponents.map(Number);
          }

          const txDate = new Date(year, month - 1, day);

          if (fromDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            if (txDate < start) matchesDate = false;
          }

          if (toDate) {
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            if (txDate > end) matchesDate = false;
          }
        }
      } catch (err) {
        console.error("Date parse error", err);
      }
    }

    return matchesSearch && matchesDate;
  });

  // Calculate Totals
  const totalIn = filteredTransactions
    .filter(t => t.type === 'IN')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalOut = filteredTransactions
    .filter(t => t.type === 'OUT')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (!isMounted) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none font-sans">
      
      {/* Green Header Banner */}
      <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Transaction History</h1>
          <p className="text-emerald-100 text-sm mt-1 font-medium">
            Track all incoming and outgoing wallet transactions
          </p>
        </div>

        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="bg-emerald-700/60 border border-emerald-500/40 rounded-xl px-5 py-3 flex-1 md:flex-initial">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-200">TOTAL IN</p>
            <p className="text-2xl font-black mt-0.5">₹{totalIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-emerald-700/60 border border-emerald-500/40 rounded-xl px-5 py-3 flex-1 md:flex-initial">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-200">TOTAL OUT</p>
            <p className="text-2xl font-black mt-0.5">₹{totalOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by wallet, staff, description, or bill ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Inputs & Clear Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              className="bg-transparent outline-none text-xs text-slate-600 font-medium cursor-pointer"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              className="bg-transparent outline-none text-xs text-slate-600 font-medium cursor-pointer"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Reset Filters Button */}
          <button 
            onClick={() => {
              const today = getToday();
              setSearchQuery('');
              setFromDate(today);
              setToDate(today);
              loadTransactions();
            }}
            title="Reset Filters & Refresh"
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition cursor-pointer"
          >
            <RotateCcw size={18} />
          </button>

          {/* Clear All History Button */}
          <button 
            onClick={clearAllHistory}
            title="Clear All History"
            className="p-2.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl transition cursor-pointer flex items-center gap-1 font-semibold text-xs px-3"
          >
            <Trash2 size={16} /> Clear All
          </button>
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
                <th className="py-4 px-6">Date & Time</th>
                <th className="py-4 px-4">Wallet</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Amount</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Staff & Bill ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const dateParts = tx.dateTime ? tx.dateTime.split(' ') : ['-', ''];
                  const dateStr = dateParts[0];
                  const timeStr = dateParts.slice(1).join(' ');

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-medium text-slate-800">
                        <div className="font-bold text-xs">{dateStr}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{timeStr}</div>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-700">
                        {tx.walletName}
                      </td>

                      <td className="py-4 px-4">
                        {tx.type === 'OUT' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                            <ArrowUpRight size={13} /> OUT
                          </span>
                        )}
                        {tx.type === 'IN' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                            <ArrowDownLeft size={13} /> IN
                          </span>
                        )}
                        {tx.type === 'UPDATE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                            <RefreshCw size={12} /> UPDATE
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-black text-slate-800">
                          ₹{(tx.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Bal: ₹{(tx.balanceAfter || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-slate-600 font-medium max-w-xs text-xs leading-relaxed">
                        {tx.description || '-'}
                      </td>

                      <td className="py-4 px-6 text-xs">
                        <div className="font-bold text-slate-700">{tx.staffName || '-'}</div>
                        <div className="text-slate-400 mt-0.5">{tx.billId || '-'}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default function TransactionHistoryPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading history...</div>}>
      <TransactionHistoryContent />
    </Suspense>
  );
}
