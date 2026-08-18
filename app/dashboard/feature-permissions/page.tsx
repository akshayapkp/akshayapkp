"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PermissionItem {
  id: string;
  featureName: string;
  accountantAccess: boolean;
  staffAccess: boolean;
}

const initialPermissions: PermissionItem[] = [
{
  id: "1",
  featureName: "Dashboard",
  accountantAccess: true,
  staffAccess: true,
},
{
  id: "2",
  featureName: "Application Forms",
  accountantAccess: true,
  staffAccess: true,
},
{
  id: "3",
  featureName: "Service Entry",
  accountantAccess: true,
  staffAccess: true,
},
{
  id: "4",
  featureName: "Saved Bills",
  accountantAccess: true,
  staffAccess: true,
},
{
  id: "5",
  featureName: "Service Management",
  accountantAccess: false,
  staffAccess: false,
},
{
  id: "6",
  featureName: "Work Status",
  accountantAccess: true,
  staffAccess: true,
},
{
  id: "7",
  featureName: "Wallet Management",
  accountantAccess: true,
  staffAccess: false,
},
{
  id: "8",
  featureName: "Billed Services",
  accountantAccess: true,
  staffAccess: false,
},
{
  id: "9",
  featureName: "Transaction History",
  accountantAccess: true,
  staffAccess: false,
},
{
  id: "10",
  featureName: "Expenses",
  accountantAccess: true,
  staffAccess: false,
},
{
  id: "11",
  featureName: "Credit Details",
  accountantAccess: true,
  staffAccess: false,
},
{
  id: "12",
  featureName: "Staff Management",
  accountantAccess: false,
  staffAccess: false,
},
{
  id: "13",
  featureName: "Staff Performance",
  accountantAccess: false,
  staffAccess: false,
},
{
  id: "14",
  featureName: "Customer Details",
  accountantAccess: true,
  staffAccess: true,
},
{
  id: "15",
  featureName: "Quick Hub",
  accountantAccess: true,
  staffAccess: true,
},
{
  id: "16",
  featureName: "Feature Permissions",
  accountantAccess: false,
  staffAccess: false,
},
{
  id: "17",
  featureName: "Latest Billed Entry",
  accountantAccess: true,
  staffAccess: true,
},
];

export default function FeaturePermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionItem[]>(initialPermissions);

  // Permissions are stored centrally in Supabase so every computer/browser
  // sees the same Staff/Accountant access settings.
  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from("feature_permissions")
          .select("permissions")
          .eq("id", 1)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled && data?.permissions) {
          const storedPermissions = Array.isArray(data.permissions)
            ? (data.permissions as PermissionItem[])
            : [];

          // Keep existing saved permissions, while automatically adding any
          // newly introduced features (such as Latest Billed Entry).
          const savedPermissions = initialPermissions.map((defaultItem) => {
            const existingItem = storedPermissions.find(
              (item) => String(item.id) === String(defaultItem.id)
            );
            return existingItem ? { ...defaultItem, ...existingItem } : defaultItem;
          });

          setPermissions(savedPermissions);
          localStorage.setItem(
            "role_feature_permissions",
            JSON.stringify(savedPermissions)
          );

          // Persist newly added feature definitions to Supabase without
          // changing the user's existing access choices.
          if (storedPermissions.length !== savedPermissions.length) {
            await supabase
              .from("feature_permissions")
              .upsert(
                {
                  id: 1,
                  permissions: savedPermissions,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "id" }
              );
          }
          return;
        }

        // First-time setup: create the central permissions row.
        const { error: insertError } = await supabase
          .from("feature_permissions")
          .upsert(
            {
              id: 1,
              permissions: initialPermissions,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

        if (insertError) throw insertError;

        if (!cancelled) {
          setPermissions(initialPermissions);
          localStorage.setItem(
            "role_feature_permissions",
            JSON.stringify(initialPermissions)
          );
        }
      } catch (error) {
        console.error("Error loading central feature permissions:", error);

        // Keep the existing local cache as a fallback if Supabase is
        // temporarily unavailable.
        if (!cancelled) {
          try {
            const cached = localStorage.getItem("role_feature_permissions");
            setPermissions(cached ? JSON.parse(cached) : initialPermissions);
          } catch {
            setPermissions(initialPermissions);
          }
        }
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (
    id: string,
    roleType: 'accountantAccess' | 'staffAccess'
  ) => {
    const updated = permissions.map((item) => {
      if (item.id === id) {
        return { ...item, [roleType]: !item[roleType] };
      }
      return item;
    });

    // Update the UI immediately.
    setPermissions(updated);
    localStorage.setItem("role_feature_permissions", JSON.stringify(updated));

    const { error } = await supabase
      .from("feature_permissions")
      .upsert(
        {
          id: 1,
          permissions: updated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Error saving central feature permissions:", error);
      alert(
        "Permissions could not be saved to the central database. Please check your internet connection and Supabase permissions."
      );
    }
  };

  const handleReset = async () => {
    setPermissions(initialPermissions);
    localStorage.setItem(
      "role_feature_permissions",
      JSON.stringify(initialPermissions)
    );

    const { error } = await supabase
      .from("feature_permissions")
      .upsert(
        {
          id: 1,
          permissions: initialPermissions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Error resetting central feature permissions:", error);
      alert(
        "Permissions reset locally, but the central database update failed."
      );
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1500px] bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-4 sm:p-5 lg:p-6">
      {/* Top Banner Box */}
      <div className="relative mb-5 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-[30px] border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-[0_22px_55px_rgba(15,23,42,0.18)] sm:flex-row sm:items-center sm:p-7">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Role Permissions</h1>
          <p className="mt-1 text-xs font-medium text-cyan-100/75 sm:text-sm">Manage access to features for Staff and Accountants</p>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/15"
          title="Reset to default"
        >
          <RefreshCw size={18} />
          <span>Reset</span>
        </button>
      </div>

      {/* Permissions Table Container */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 p-5">
          <h2 className="text-base font-black tracking-tight text-slate-800">Feature Access Control</h2>
          <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
            {permissions.length} Features
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-400">
                <th className="p-4 font-black">Feature Name</th>
                <th className="w-48 p-4 text-center font-black">Accountant Access</th>
                <th className="w-48 p-4 text-center font-black">Staff Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissions.map((item) => (
                <tr key={item.id} className="transition-all hover:bg-cyan-50/35">
                  <td className="p-4 text-sm font-black text-slate-700">{item.featureName}</td>
                  
                  {/* Accountant Access Checkbox */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      <div 
                        onClick={() => handleToggle(item.id, 'accountantAccess')}
                        className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border transition-all ${
                          item.accountantAccess 
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                            : 'border-slate-300 bg-white hover:border-cyan-400 hover:bg-cyan-50/40'
                        }`}
                      >
                        {item.accountantAccess && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </td>

                  {/* Staff Access Checkbox */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                      <div 
                        onClick={() => handleToggle(item.id, 'staffAccess')}
                        className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border transition-all ${
                          item.staffAccess 
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                            : 'border-slate-300 bg-white hover:border-cyan-400 hover:bg-cyan-50/40'
                        }`}
                      >
                        {item.staffAccess && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}