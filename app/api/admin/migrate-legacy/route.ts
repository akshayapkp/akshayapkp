import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const arr = (value: unknown): AnyRecord[] => (Array.isArray(value) ? value.filter(v => v && typeof v === "object") : []);

function num(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function text(...values: unknown[]) {
  for (const value of values) {
    const s = String(value ?? "").trim();
    if (s) return s;
  }
  return "";
}

function sourceId(prefix: string, item: AnyRecord, index: number) {
  return text(item.id, item.billId, item.applicationNumber, item.applicationNo, item.staffId) || `${prefix}:${index}`;
}

export async function POST(request: NextRequest) {
  const expected = process.env.ADMIN_MIGRATION_KEY;
  const provided = request.headers.get("x-migration-key");

  if (!expected || !provided || provided !== expected) {
    return NextResponse.json({ error: "Migration endpoint is not authorized." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: rows, error: readError } = await supabase
      .from("feature_permissions")
      .select("id, permissions")
      .in("id", [1, 999999]);

    if (readError) throw readError;

    const mergedData: AnyRecord = {};
    for (const row of rows ?? []) {
      const permissions = row?.permissions;
      if (permissions?.data && typeof permissions.data === "object") Object.assign(mergedData, permissions.data);
    }

    const legacySources = [
      "managedCustomers",
      "managedServices",
      "savedBillsList",
      "smart_akshaya_bills",
      "serviceEntries",
      "billedServicesData",
      "expensesData",
      "walletTransactions",
      "managedWallets",
      "customerApplications",
      "staff_attendance_logs",
    ];

    for (const key of legacySources) {
      const payload = mergedData[key];
      if (payload !== undefined) {
        const { error } = await supabase.from("legacy_migration_snapshots").insert({
          source_key: key,
          payload: Array.isArray(payload) ? payload : payload ?? {},
        });
        if (error) throw error;
      }
    }

    const customers = arr(mergedData.managedCustomers).map((item, index) => ({
      name: text(item.name, item.customerName, item.fullName) || "Unnamed Customer",
      mobile: text(item.mobile, item.mobileNumber, item.phone, item.phoneNumber) || null,
      email: text(item.email) || null,
      address: text(item.address, item.location) || null,
      dob: text(item.dob, item.dateOfBirth) || null,
      aadhaar_masked: text(item.aadhaarMasked, item.maskedAadhaar) || null,
      parent_name: text(item.parentName, item.fatherName, item.motherName) || null,
      customer_code: text(item.customerId, item.customerCode) || null,
      source_legacy_id: sourceId("customer", item, index),
      raw_data: item,
    }));
    if (customers.length) {
      const { error } = await supabase.from("customers").upsert(customers, { onConflict: "source_legacy_id" });
      if (error) throw error;
    }

    const services = arr(mergedData.managedServices).map((item, index) => ({
      service_name: text(item.name, item.serviceName, item.title) || `Legacy Service ${index + 1}`,
      category: text(item.category, item.type) || null,
      price: num(item.price, item.amount, item.rate),
      active: item.active !== false && item.enabled !== false,
      source_legacy_id: sourceId("service", item, index),
      raw_data: item,
    }));
    if (services.length) {
      const { error } = await supabase.from("services").upsert(services, { onConflict: "source_legacy_id" });
      if (error) throw error;
    }

    const bills = [
      ...arr(mergedData.savedBillsList),
      ...arr(mergedData.smart_akshaya_bills),
    ];
    const billRows = bills.map((item, index) => ({
      bill_number: text(item.billNumber, item.billNo, item.invoiceNumber) || null,
      staff_name: text(item.staffName, item.staff, item.createdBy) || null,
      status: text(item.status) || "paid",
      subtotal: num(item.subtotal, item.subTotal, item.totalAmount),
      discount: num(item.discount),
      total_amount: num(item.totalAmount, item.total, item.amount),
      paid_amount: num(item.paidAmount, item.paid, item.totalPaid),
      balance_amount: num(item.owedAmount, item.balance, item.balanceAmount),
      payment_method: text(item.paymentMethod, item.paymentMode) || null,
      notes: text(item.note, item.notes) || null,
      source_legacy_id: sourceId("bill", item, index),
      raw_data: item,
    }));
    if (billRows.length) {
      const { error } = await supabase.from("bills").upsert(billRows, { onConflict: "source_legacy_id" });
      if (error) throw error;
    }

    const serviceEntries = [
      ...arr(mergedData.serviceEntries),
      ...arr(mergedData.billedServicesData),
    ];
    const entryRows = serviceEntries.map((item, index) => ({
      service_name: text(item.serviceName, item.service, item.name) || "Legacy Service",
      staff_name: text(item.staffName, item.staff, item.createdBy) || null,
      qty: num(item.qty, item.quantity) || 1,
      unit_price: num(item.unitPrice, item.price, item.rate),
      amount: num(item.amount, item.totalAmount, item.total),
      status: text(item.status) || "completed",
      source_legacy_id: sourceId("service-entry", item, index),
      raw_data: item,
    }));
    if (entryRows.length) {
      const { error } = await supabase.from("service_entries").upsert(entryRows, { onConflict: "source_legacy_id" });
      if (error) throw error;
    }

    const expenses = arr(mergedData.expensesData).map((item, index) => ({
      expense_date: text(item.date, item.expenseDate) || new Date().toISOString().slice(0, 10),
      category: text(item.category, item.name) || "General",
      description: text(item.description, item.note) || null,
      amount: num(item.amount, item.total),
      staff_name: text(item.staffName, item.staff) || null,
      source_legacy_id: sourceId("expense", item, index),
      raw_data: item,
    }));
    if (expenses.length) {
      const { error } = await supabase.from("expenses").upsert(expenses, { onConflict: "source_legacy_id" });
      if (error) throw error;
    }

    const walletItems = [
      ...arr(mergedData.walletTransactions),
      ...arr(mergedData.managedWallets),
    ];
    const walletRows = walletItems.map((item, index) => ({
      wallet_name: text(item.walletName, item.name, item.wallet) || null,
      transaction_type: text(item.transactionType, item.type) || "credit",
      amount: num(item.amount, item.value, item.balance),
      reference: text(item.reference, item.id) || null,
      notes: text(item.note, item.notes) || null,
      staff_name: text(item.staffName, item.staff) || null,
      source_legacy_id: sourceId("wallet", item, index),
      raw_data: item,
    }));
    if (walletRows.length) {
      const { error } = await supabase.from("wallet_transactions").upsert(walletRows, { onConflict: "source_legacy_id" });
      if (error) throw error;
    }

    const applications = arr(mergedData.customerApplications).map((item, index) => ({
      application_number: text(item.applicationNumber, item.applicationNo) || `LEGACY-${index + 1}`,
      service_name: text(item.service, item.serviceName) || "Application",
      audience: text(item.audience) || null,
      customer_name: text(item.customer?.name, item.customerName, item.name) || null,
      mobile: text(item.customer?.mobile, item.mobile, item.mobileNumber) || null,
      address: text(item.customer?.address, item.address) || null,
      document_names: Array.isArray(item.documentNames) ? item.documentNames : [],
      status: text(item.status) || "Submitted",
      submitted_at: item.submittedAt || item.createdAt || new Date().toISOString(),
      raw_data: item,
    }));
    if (applications.length) {
      const { error } = await supabase.from("customer_applications").upsert(applications, { onConflict: "application_number" });
      if (error) throw error;
    }

    const attendance = arr(mergedData.staff_attendance_logs).map((item, index) => ({
      staff_name: text(item.staffName, item.name) || "Staff",
      attendance_date: text(item.date) || (item.timestamp ? new Date(item.timestamp).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
      login_at: item.timestamp || item.loginAt || null,
      logout_at: item.logoutAt || null,
      source_legacy_id: sourceId("attendance", item, index),
      raw_data: item,
    }));
    if (attendance.length) {
      const { error } = await supabase.from("attendance_logs").upsert(attendance, { onConflict: "source_legacy_id" });
      if (error) throw error;
    }

    await supabase.from("data_audit_log").insert({
      entity_type: "legacy_migration",
      action: "completed",
      actor_name: "migration-endpoint",
      metadata: {
        customers: customers.length,
        services: services.length,
        bills: billRows.length,
        serviceEntries: entryRows.length,
        expenses: expenses.length,
        walletTransactions: walletRows.length,
        applications: applications.length,
        attendance: attendance.length,
      },
    });

    return NextResponse.json({
      ok: true,
      migrated: {
        customers: customers.length,
        services: services.length,
        bills: billRows.length,
        serviceEntries: entryRows.length,
        expenses: expenses.length,
        walletTransactions: walletRows.length,
        applications: applications.length,
        attendance: attendance.length,
      },
      message: "Legacy data was snapshotted and copied into the Phase 2 normalized tables.",
    });
  } catch (error: any) {
    console.error("Legacy migration failed:", error);
    return NextResponse.json({ error: error?.message || "Migration failed." }, { status: 500 });
  }
}
