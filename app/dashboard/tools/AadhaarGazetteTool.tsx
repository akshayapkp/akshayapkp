"use client";

import React, { useState } from "react";
import { Printer, RotateCcw, X, FileText } from "lucide-react";

type FormState = Record<string, string>;

const initial: FormState = {
  date: "", month: "", year: "", aadhaar: "", fullName: "", fullName2: "",
  house: "", street: "", landmark: "", area: "", village: "", postOffice: "",
  district: "", state: "", pin: "", certifierName: "", designation: "",
  office1: "", office2: "", contact: "",
};

const inputClass =
  "h-7 w-full border border-slate-400 bg-white px-1.5 text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200";

function Field({ label, value, onChange, wide = true }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <div className={wide ? "grid grid-cols-[132px_1fr] items-center gap-1" : "grid grid-cols-[132px_1fr] items-center gap-1"}>
      <label className="text-[9px] font-bold leading-3 text-slate-800">{label}:</label>
      <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-w-0 items-center gap-1 text-[8px] font-medium leading-3 text-slate-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3 w-3 shrink-0 accent-blue-700" />
      <span>{label}</span>
    </label>
  );
}

export default function AadhaarGazetteTool({ onClose }: { onClose?: () => void }) {
  const [form, setForm] = useState<FormState>(initial);
  const [checks, setChecks] = useState<Record<string, boolean>>({
    resident: true, nri: false, oci: false, newEnrol: false, update: true,
    cert0: false, cert1: false, cert2: false, cert3: false, cert4: false, cert5: false,
    noOverwrite: false, issueDate: false, residentSignature: false, certDetails: false, photoCross: false,
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const toggle = (key: string, value: boolean) => setChecks((p) => ({ ...p, [key]: value }));

  const reset = () => {
    setForm(initial);
    setChecks({
      resident: true, nri: false, oci: false, newEnrol: false, update: true,
      cert0: false, cert1: false, cert2: false, cert3: false, cert4: false, cert5: false,
      noOverwrite: false, issueDate: false, residentSignature: false, certDetails: false, photoCross: false,
    });
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/65 p-2 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { visibility: hidden !important; }
          .aadhaar-print-root, .aadhaar-print-root * { visibility: visible !important; }
          .aadhaar-print-root { position: absolute !important; inset: 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; box-shadow: none !important; border: 0 !important; }
          .aadhaar-no-print { display: none !important; }
          .aadhaar-paper { box-shadow: none !important; border: 0 !important; }
        }
      `}</style>

      <div className="aadhaar-print-root flex h-[96vh] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl print:h-auto print:w-[210mm] print:max-w-none print:rounded-none print:bg-white">
        <div className="aadhaar-no-print flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white"><FileText size={17} /></div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Aadhaar Gazette</h2>
              <p className="text-[10px] text-slate-500">Aadhaar enrolment / update certificate</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><RotateCcw size={14} /> Reset</button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><Printer size={14} /> Print</button>
            {onClose && <button type="button" onClick={onClose} aria-label="Close" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={17} /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-200/70 p-3 print:overflow-visible print:bg-white print:p-0">
          <div className="aadhaar-paper mx-auto min-h-[297mm] w-[210mm] bg-white px-[10mm] pb-[7mm] pt-[6mm] text-slate-900 shadow-lg print:min-h-[297mm] print:w-[210mm] print:shadow-none">
            <header className="border-b-[3px] border-orange-500 pb-1">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center leading-none">
                  <div className="text-[16px] font-black text-orange-600">Mera Aadhaar</div>
                  <div className="text-[16px] font-black text-emerald-700">Meri Pehchaan</div>
                </div>
                <div className="border-l border-slate-400 pl-5 text-[16px] font-bold leading-5 text-slate-700">
                  <div>Unique Identification</div><div>Authority of India</div>
                </div>
              </div>
            </header>

            <div className="mt-1 bg-red-600 px-2 py-1.5 text-center text-[10px] font-black text-white">
              CERTIFICATE FOR AADHAAR ENROLMENT/ UPDATE (TO BE USED ONLY AS PROOF OF ADDRESS*)
            </div>
            <div className="flex justify-between px-1 py-1 text-[8px] italic text-red-700">
              <span>Instructions: All details to be filled in Block Letters</span>
              <span>(To be valid for 3 months from date of issue)</span>
            </div>

            <div className="flex items-center justify-between px-1 pb-1 text-[8px]">
              <span>To be printed on plain A4 paper size;</span>
              <span>Not required to be printed on letter head;</span>
              <div className="flex gap-1">
                <input value={form.date} onChange={(e) => set("date", e.target.value)} className="h-5 w-7 border border-slate-300 text-center text-[8px]" placeholder="DD" />
                <input value={form.month} onChange={(e) => set("month", e.target.value)} className="h-5 w-7 border border-slate-300 text-center text-[8px]" placeholder="MM" />
                <input value={form.year} onChange={(e) => set("year", e.target.value)} className="h-5 w-12 border border-slate-300 text-center text-[8px]" placeholder="YYYY" />
              </div>
            </div>

            <div className="bg-[#312b75] px-2 py-1.5 text-center text-[11px] font-black text-white">
              INDIVIDUAL SEEKING TO ENROL / AADHAAR NUMBER HOLDER DETAILS
            </div>

            <div className="grid grid-cols-[1fr_1fr_1fr] gap-x-3 gap-y-1 border-b border-slate-300 py-2">
              <Check label="Resident" checked={checks.resident} onChange={(v) => toggle("resident", v)} />
              <Check label="Non-Resident Indian (NRI)" checked={checks.nri} onChange={(v) => toggle("nri", v)} />
              <Check label="OCI / LTV / Nepal / Bhutan National / Foreign National" checked={checks.oci} onChange={(v) => toggle("oci", v)} />
              <Check label="New Enrolment" checked={checks.newEnrol} onChange={(v) => toggle("newEnrol", v)} />
              <Check label="Update Request" checked={checks.update} onChange={(v) => toggle("update", v)} />
            </div>

            <div className="mt-1 space-y-1">
              <Field label="Aadhaar Number" value={form.aadhaar} onChange={(v) => set("aadhaar", v)} />
              <Field label="Full Name" value={form.fullName} onChange={(v) => set("fullName", v)} />
              <Field label="" value={form.fullName2} onChange={(v) => set("fullName2", v)} />
              <Field label="House No/ Bldg./ Apt" value={form.house} onChange={(v) => set("house", v)} />
              <Field label="Street/ Road/ Lane" value={form.street} onChange={(v) => set("street", v)} />
              <Field label="Landmark" value={form.landmark} onChange={(v) => set("landmark", v)} />
              <Field label="Area/ Locality/ Sector" value={form.area} onChange={(v) => set("area", v)} />
              <Field label="Village/ Town/ City" value={form.village} onChange={(v) => set("village", v)} />
              <Field label="Post Office" value={form.postOffice} onChange={(v) => set("postOffice", v)} />
              <Field label="District" value={form.district} onChange={(v) => set("district", v)} />
              <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
              <Field label="PIN Code" value={form.pin} onChange={(v) => set("pin", v)} />
            </div>

            <div className="mt-2 grid grid-cols-[1fr_115px] gap-2">
              <div className="border border-slate-400 p-2 text-center text-[8px] text-slate-500">
                <div className="mb-1 font-bold text-slate-700">Signature / Thumb / Finger Impression of Individual Seeking to Enrol / Aadhaar Number Holder</div>
                <div className="h-10" />
              </div>
              <div className="flex h-[90px] items-center justify-center border border-slate-400 text-center text-[8px] text-slate-500">
                Individual Seeking to Enrol / Aadhaar Number Holder<br />Recent Colour Passport-Size Photograph
              </div>
            </div>

            <div className="mt-2 bg-[#dff0e0] px-2 py-1.5 text-center text-[11px] font-black text-[#2f3b77]">
              CERTIFIER'S DETAILS (TO BE FILLED BY THE CERTIFIER ONLY)
            </div>
            <div className="mt-2 space-y-1">
              <Field label="Name of the Certifier" value={form.certifierName} onChange={(v) => set("certifierName", v)} />
              <Field label="Designation" value={form.designation} onChange={(v) => set("designation", v)} />
              <Field label="Office Address" value={form.office1} onChange={(v) => set("office1", v)} />
              <Field label="" value={form.office2} onChange={(v) => set("office2", v)} />
              <Field label="Contact Number" value={form.contact} onChange={(v) => set("contact", v)} />
            </div>

            <div className="mt-2 grid grid-cols-[1.25fr_1fr] gap-3">
              <div className="text-[7px] leading-3">
                <div className="font-bold">I hereby certify above mentioned details of the Individual seeking to enrol / Aadhaar number holder and i am a.... (Tick appropriate box below)</div>
                {[
                  "MP / MLA / MLC / Municipal Councillor",
                  "Gazetted Officer Group A / Employees Provident Fund Organisation (EPFO) Officer",
                  "Tehsildar / Gazetted Officer Group B",
                  "Gazetted Officer at National AIDS Control Organisation (NACO) / State Health Department",
                  "Head of recognised educational institution (only for the institute students concerned)",
                  "Village Panchayat Head / President or Mukhiya / Gaon Bura / equivalent authority (for rural areas)",
                ].map((label, i) => <div key={label} className="mt-1"><Check label={label} checked={checks[`cert${i}`]} onChange={(v) => toggle(`cert${i}`, v)} /></div>)}
              </div>

              <div>
                <div className="text-[8px] font-black">CHECKLIST FOR CERTIFIER</div>
                <div className="mt-1 grid grid-cols-2 gap-1 text-[7px]">
                  <Check label="No overwriting" checked={checks.noOverwrite} onChange={(v) => toggle("noOverwrite", v)} />
                  <Check label="Issue date is filled" checked={checks.issueDate} onChange={(v) => toggle("issueDate", v)} />
                  <Check label="Resident's signature" checked={checks.residentSignature} onChange={(v) => toggle("residentSignature", v)} />
                  <Check label="Certifier's details" checked={checks.certDetails} onChange={(v) => toggle("certDetails", v)} />
                  <Check label="Resident's Photo is cross signed and cross stamped" checked={checks.photoCross} onChange={(v) => toggle("photoCross", v)} />
                </div>
                <div className="mt-2 flex h-[70px] items-end justify-center border border-slate-400 pb-2 text-[7px] text-slate-500">Signature &amp; Stamp of the Certifier</div>
              </div>
            </div>

            <div className="mt-2 border-t border-slate-300 pt-1 text-[6px] text-slate-600">
              *To be used as Proof of Identity (PoI) only in specific cases as mentioned in the list of applicable supporting documents.
            </div>
            <div className="mt-2 text-center text-[9px] font-black text-orange-600">Mera Aadhaar, Meri Pehchaan</div>
          </div>
        </div>
      </div>
    </div>
  );
}
