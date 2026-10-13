"use client";

import React, { useState, useEffect } from 'react';
import { hashPassword } from "@/lib/supabase";
import { 
  Users, Search, Plus, Edit2, Trash2, Mail, Phone, RefreshCw, Eye, Shield, Key, Settings2 
} from "lucide-react";

interface Staff {
  id: string;
  staffId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  salary: number;
  upiId?: string;
  password?: string;
}

const INITIAL_STAFF: Staff[] = [
  { id: '1', staffId: '#1', name: 'Admin User', email: 'admin@gmail.com', phone: '8589868773', role: 'Admin', salary: 10000 },
  { id: '2', staffId: '#2', name: 'FASNIL', email: 'fasnil@gmail.com', phone: '9544739520', role: 'Accountant', salary: 10000 },
  { id: '3', staffId: '#3', name: 'SUMAYYA', email: 'sumayya@gmail.com', phone: '7025400130', role: 'Staff', salary: 10000 },
  { id: '4', staffId: '#4', name: 'SHEEJA', email: 'sheeja@gmail.com', phone: '8907428080', role: 'Staff', salary: 10000 },
  { id: '5', staffId: '#5', name: 'SAHLA', email: 'sahla@gmail.com', phone: '9037977659', role: 'Staff', salary: 10000 },
];

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // New Staff Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('Staff');
  const [newSalary, setNewSalary] = useState(10000);
  const [newUpiId, setNewUpiId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Edit Staff Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSalary, setEditSalary] = useState(0);
  const [editUpiId, setEditUpiId] = useState('');
const [editPassword, setEditPassword] = useState("");

  useEffect(() => {
    const mapRow = (row: any): Staff => ({
      id: String(row.id),
      staffId: String(row.staff_id ?? ""),
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      phone: String(row.phone ?? ""),
      role: String(row.role ?? "Staff"),
      salary: Number(row.salary ?? 0),
      upiId: String(row.upi_id ?? ""),
      // Password hashes are never returned to the browser.
      password: "",
    });

    const loadStaff = async () => {
      try {
        const response = await fetch("/api/staff", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) {
          alert(result.error || "Unable to load staff records.");
          return;
        }
        const existing = Array.isArray(result.staff) ? result.staff : [];
        if (existing.length > 0) {
          setStaffList(existing.map(mapRow));
          return;
        }

        // Migrate browser-only staff data only when the database is empty.
        // Never create demo/default accounts automatically.
        const saved = localStorage.getItem("smart_akshaya_staff");
        if (!saved) {
          setStaffList([]);
          return;
        }
        try {
          const localStaff = JSON.parse(saved);
          if (!Array.isArray(localStaff) || localStaff.length === 0) {
            setStaffList([]);
            return;
          }
          const rows = await Promise.all(localStaff.map(async (item: any, index: number) => {
            const plainPassword = String(item.password ?? `${String(item.name ?? "staff").trim().split(" ")[0].toLowerCase()}akshaya`);
            return {
              id: String(item.id ?? Date.now() + index),
              staff_id: String(item.staffId ?? `#${index + 1}`),
              name: String(item.name ?? "").trim(),
              email: String(item.email ?? ""),
              phone: String(item.phone ?? ""),
              role: String(item.role ?? "Staff"),
              salary: Number(item.salary ?? 0),
              upi_id: String(item.upiId ?? item.upi_id ?? ""),
              password: await hashPassword(plainPassword),
            };
          }));
          const migration = await fetch("/api/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "migrate", staff: rows }),
          });
          const migrated = await migration.json();
          if (!migration.ok) {
            alert(migrated.error || "Unable to migrate old staff records.");
            return;
          }
          setStaffList((migrated.staff ?? []).map(mapRow));
        } catch {
          alert("Old browser staff data could not be read. No staff records were deleted.");
        }
      } catch {
        alert("Unable to connect to Staff Management. Please try again.");
      }
    };

    loadStaff();
  }, []);

  const handleAutoGeneratePassword = (isEdit: boolean = false) => {
    const nameVal = isEdit ? editName : newName;
    const firstName = nameVal.trim().split(' ')[0].toLowerCase() || 'staff';
    const generated = `${firstName}akshaya`;
    if (isEdit) {
      setEditPassword(generated);
    } else {
      setNewPassword(generated);
    }
  };

 const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const firstName = newName.trim().split(" ")[0].toLowerCase();
    const finalPassword = newPassword.trim() || `${firstName}akshaya`;
    const row = {
      id: Date.now().toString(),
      staff_id: `#${staffList.length + 1}`,
      name: newName.trim(),
      email: newEmail || "",
      phone: newPhone || "",
      role: newRole,
      salary: Number(newSalary) || 0,
      upi_id: newUpiId.trim(),
      password: await hashPassword(finalPassword),
    };

    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff: row }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to add staff.");
      return;
    }
    const inserted = result.staff?.[0];
    if (!inserted) {
      alert("Staff was not returned by the server.");
      return;
    }
    setStaffList((current) => [{
      id: String(inserted.id),
      staffId: String(inserted.staff_id),
      name: String(inserted.name),
      email: String(inserted.email ?? ""),
      phone: String(inserted.phone ?? ""),
      role: String(inserted.role ?? "Staff"),
      salary: Number(inserted.salary ?? 0),
      upiId: String(inserted.upi_id ?? ""),
      password: "",
    }, ...current]);

    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("Staff");
    setNewSalary(10000);
    setNewUpiId("");
    setNewPassword("");
    setShowAddModal(false);
  };

  const handleOpenEdit = (staff: Staff) => {
    setSelectedStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPhone(staff.phone);
    setEditRole(staff.role);
setEditSalary(staff.salary);
setEditUpiId(staff.upiId || "");
setEditPassword("");
setShowEditModal(true);
  };

 // എഡിറ്റ് ചെയ്യുന്ന ഫോമിൽ പുതിയ പാസ്‌വേഡ് സ്റ്റേറ്റ് ഉണ്ടെന്ന് ഉറപ്പാക്കുകയോ അല്ലെങ്കിൽ നിലവിലുള്ളത് നിലനിർത്തുകയോ ചെയ്യുക
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    const updateData: any = {
      name: editName.trim(),
      email: editEmail,
      phone: editPhone,
      role: editRole,
      salary: Number(editSalary) || 0,
      upi_id: editUpiId.trim(),
    };
    if (editPassword.trim()) updateData.password = await hashPassword(editPassword.trim());

    const response = await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedStaff.id, staff: updateData }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to update staff.");
      return;
    }
    const updated = result.staff;
    setStaffList((current) => current.map((staff) => staff.id === selectedStaff.id ? {
      id: String(updated.id),
      staffId: String(updated.staff_id),
      name: String(updated.name),
      email: String(updated.email ?? ""),
      phone: String(updated.phone ?? ""),
      role: String(updated.role ?? "Staff"),
      salary: Number(updated.salary ?? 0),
      upiId: String(updated.upi_id ?? ""),
      password: "",
    } : staff));

    alert(editPassword.trim() ? "Staff details and password updated successfully." : "Staff details updated successfully.");
    setShowEditModal(false);
    setSelectedStaff(null);
    setEditPassword("");
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    const response = await fetch("/api/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to delete staff.");
      return;
    }
    setStaffList((current) => current.filter((staff) => staff.id !== id));
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>\n      <div className="mb-4 flex justify-end"><a href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"><Settings2 size={16}/> All Settings</a></div>
    <div className="relative mx-auto min-h-screen w-full max-w-[1500px] space-y-5 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-4 pb-24 sm:p-5 sm:pb-24 lg:p-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Staff Management</h1>
      </div>

      {/* Top Gradient Banner Card */}
      <div className="relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-[30px] border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6 text-white shadow-[0_22px_55px_rgba(15,23,42,0.18)] md:flex-row md:items-center sm:p-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Staff Profiles</p>
          <h2 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{staffList.length}</h2>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 backdrop-blur-xl">
          <Users size={24} className="text-white" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">Active Accounts</p>
            <p className="text-sm font-black">{staffList.length}</p>
          </div>
        </div>
      </div>

      {/* Staff Directory Header & Search Bar */}
      <div className="flex flex-col items-start justify-between gap-4 pt-1 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-black tracking-tight text-slate-800">Staff Directory</h3>
          <button 
            onClick={() => window.location.reload()} 
            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-cyan-50 hover:text-cyan-700"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID or email..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs font-semibold outline-none shadow-sm transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Staff Table Section */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_12px_35px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4 font-black">Staff ID</th>
                <th className="px-6 py-4 font-black">Name</th>
                <th className="px-6 py-4 font-black">Contact</th>
                <th className="px-6 py-4 font-black">Role</th>
                <th className="px-6 py-4 font-black">Salary</th>
                <th className="px-6 py-4 font-black">UPI</th>
                <th className="py-4 px-6 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="text-slate-700 transition-all hover:bg-cyan-50/30">
                    <td className="px-6 py-4 font-black text-slate-500">{staff.staffId}</td>
                    <td className="px-6 py-4 font-black text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 text-xs font-black text-cyan-700">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{staff.name}</span>
                      </div>
                    </td>
                    <td className="space-y-1 px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail size={12} className="text-slate-400" />
                        <span>{staff.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone size={12} className="text-slate-400" />
                        <span>{staff.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        staff.role.toLowerCase() === 'admin' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                          : staff.role.toLowerCase() === 'accountant'
                          ? 'bg-purple-50 text-purple-600 border border-purple-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-800">₹{staff.salary}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                      {staff.upiId || <span className="text-slate-300">Not set</span>}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenEdit(staff)}
                        className="inline-flex items-center justify-center rounded-xl bg-cyan-50 p-2 text-cyan-700 transition-all hover:-translate-y-0.5 hover:bg-cyan-100"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-rose-50 p-2 text-rose-600 transition-all hover:-translate-y-0.5 hover:bg-rose-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_15px_35px_rgba(6,182,212,0.28)] transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95"
        title="Add Staff"
      >
        <Plus size={24} />
      </button>

      {/* Add New Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-rose-500" />
                <h3 className="text-lg font-black tracking-tight text-slate-800">Add New Staff</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-xl p-1 text-sm font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Full Name *</label>
                <div className="relative mt-1.5">
                  <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Mobile *</label>
                  <div className="relative mt-1.5">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="10-digit number"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Email *</label>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="name@mail.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">User Role</label>
                  <div className="relative mt-1.5">
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="Staff">Staff</option>
                      <option value="Online Staff">Online Staff</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Basic Salary</label>
                  <input
                    type="number"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                    value={newSalary}
                    onChange={(e) => setNewSalary(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500">UPI ID</label>
                <input
                  type="text"
                  inputMode="email"
                  placeholder="example@upi"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                  value={newUpiId}
                  onChange={(e) => setNewUpiId(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-slate-400">Used automatically for the salary payment QR.</p>
              </div>


              <div>
                <div className="flex justify-between items-center mt-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Password</label>
                  <button 
                    type="button" 
                    onClick={() => handleAutoGeneratePassword(false)} 
                    className="text-xs font-black text-cyan-700 hover:underline"
                  >
                    Auto Generate
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Leave empty for default: [firstname]akshaya"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs outline-none focus:ring-2 focus:ring-rose-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Eye size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600" />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-white/80 bg-white/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-rose-500" />
                <h3 className="text-lg font-black tracking-tight text-slate-800">Edit Staff Profile</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="rounded-xl p-1 text-sm font-black text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Full Name *</label>
                <div className="relative mt-1.5">
                  <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Mobile *</label>
                  <div className="relative mt-1.5">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Email *</label>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">User Role</label>
                  <div className="relative mt-1.5">
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    >
                      <option value="Staff">Staff</option>
                      <option value="Online Staff">Online Staff</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Basic Salary</label>
                  <input
                    type="number"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                    value={editSalary}
                    onChange={(e) => setEditSalary(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-500">UPI ID</label>
                <input
                  type="text"
                  inputMode="email"
                  placeholder="example@upi"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold outline-none transition-all focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                  value={editUpiId}
                  onChange={(e) => setEditUpiId(e.target.value)}
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Used automatically for the salary payment QR.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mt-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Password</label>
                  <button type="button" onClick={() => handleAutoGeneratePassword(true)} className="text-xs font-black text-cyan-700 hover:underline">
                    Auto Generate
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
  type="text"
  value={editPassword}
  onChange={(e) => setEditPassword(e.target.value)}
  placeholder="Enter new password"
  className="w-full border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs outline-none focus:ring-2 focus:ring-rose-500"
/>
                  <Eye size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600" />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    </>
  );
}