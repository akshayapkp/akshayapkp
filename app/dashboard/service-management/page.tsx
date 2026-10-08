"use client";

import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, RefreshCw, Briefcase, ExternalLink, Bookmark, X } from 'lucide-react';

interface ServiceItem {
  id: string;
  name: string;
  wallet: string;
  deptFee: number;
  srvCharge: number;
  commission: number;
  followupDays?: number;
  portalUrl?: string;
  isPinned?: boolean;
}

const initialServices: ServiceItem[] = [
  { id: "1", name: "Aadhaar 125", wallet: "CASH", deptFee: 0, srvCharge: 125, commission: 5, portalUrl: "" },
  { id: "2", name: "Aadhaar 50", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "3", name: "Aadhaar 75", wallet: "CASH", deptFee: 0, srvCharge: 75, commission: 5, portalUrl: "" },
  { id: "4", name: "Aadhaar online Demographic Update", wallet: "BANK", deptFee: 83, srvCharge: 57, commission: 5, portalUrl: "https://myaadhaar.uidai.gov.in/", isPinned: true },
  { id: "5", name: "Aadhaar Online Document Update", wallet: "BANK", deptFee: 75, srvCharge: 50, commission: 5, portalUrl: "https://myaadhaar.uidai.gov.in/" },
  { id: "6", name: "Aadhaar Printout", wallet: "CASH", deptFee: 0, srvCharge: 20, commission: 5, portalUrl: "" },
  { id: "7", name: "Aadhaar PVC", wallet: "BANK", deptFee: 75, srvCharge: 50, commission: 5, portalUrl: "https://myaadhaar.uidai.gov.in/" },
  { id: "8", name: "Agnipath/Agniveer", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "9", name: "Agristack Farmer Registration", wallet: "CASH", deptFee: 0, srvCharge: 60, commission: 5, portalUrl: "" },
  { id: "10", name: "AIIMS-Agriculture", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "11", name: "All Bank Balance & Mini Statement", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 5, portalUrl: "" },
  { id: "12", name: "AYUSHMAN CARD", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "13", name: "Bank Account Opening", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "14", name: "Birth Certificate", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "15", name: "Caste Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "16", name: "Driving Licence Application", wallet: "BANK", deptFee: 200, srvCharge: 100, commission: 5, portalUrl: "https://parivahan.gov.in/" },
  { id: "17", name: "Electricity Bill Payment", wallet: "CASH", deptFee: 0, srvCharge: 20, commission: 2, portalUrl: "https://kseb.in/" },
  { id: "18", name: "Income Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "19", name: "PAN Card Application", wallet: "BANK", deptFee: 107, srvCharge: 50, commission: 5, portalUrl: "https://www.protean.in/" },
  { id: "20", name: "Ration Card Services", wallet: "BANK", deptFee: 0, srvCharge: 60, commission: 5, portalUrl: "https://civilsupplieskerala.gov.in/" },
  { id: "21", name: "Aadhaar Address Update", wallet: "BANK", deptFee: 50, srvCharge: 50, commission: 5, portalUrl: "https://myaadhaar.uidai.gov.in/" },
  { id: "22", name: "Passport Application", wallet: "BANK", deptFee: 1500, srvCharge: 200, commission: 5, portalUrl: "https://www.passportindia.gov.in/" },
  { id: "23", name: "Voter ID Registration", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://voters.eci.gov.in/" },
  { id: "24", name: "SSLC Book Copy", wallet: "BANK", deptFee: 100, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "25", name: "Pancard Correction", wallet: "BANK", deptFee: 107, srvCharge: 60, commission: 5, portalUrl: "https://www.protean.in/" },
  { id: "26", name: "Employment Exchange Registration", wallet: "CASH", deptFee: 0, srvCharge: 40, commission: 5, portalUrl: "" },
  { id: "27", name: "Police Clearance Certificate", wallet: "BANK", deptFee: 250, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "28", name: "Property Tax Payment", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 2, portalUrl: "" },
  { id: "29", name: "Water Bill Payment", wallet: "CASH", deptFee: 0, srvCharge: 20, commission: 2, portalUrl: "" },
  { id: "30", name: "Life Certificate (Jeevan Pramaan)", wallet: "CASH", deptFee: 0, srvCharge: 40, commission: 5, portalUrl: "" },
  { id: "31", name: "Senior Citizen ID Card", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "32", name: "LLDC / Ownership Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "33", name: "Non-Creamy Layer Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "34", name: "Community Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "35", name: "Nativity Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "36", name: "Family Membership Certificate", wallet: "BANK", deptFee: 30, srvCharge: 50, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "37", name: "Solvency Certificate", wallet: "BANK", deptFee: 50, srvCharge: 50, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "38", name: "POSDC / Possession Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "39", name: "Relationship Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "40", name: "Inter-caste Marriage Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "41", name: "Destitute Certificate", wallet: "BANK", deptFee: 30, srvCharge: 40, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "42", name: "Aadhar Bio-metric Lock/Unlock", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 5, portalUrl: "https://myaadhaar.uidai.gov.in/" },
  { id: "43", name: "Passport Seva Renewal", wallet: "BANK", deptFee: 1500, srvCharge: 200, commission: 5, portalUrl: "https://www.passportindia.gov.in/" },
  { id: "44", name: "Voter ID Correction", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://voters.eci.gov.in/" },
  { id: "45", name: "Voter ID Address Shift", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://voters.eci.gov.in/" },
  { id: "46", name: "Ration Card New Member Addition", wallet: "BANK", deptFee: 0, srvCharge: 60, commission: 5, portalUrl: "https://civilsupplieskerala.gov.in/" },
  { id: "47", name: "Ration Card Address Change", wallet: "BANK", deptFee: 0, srvCharge: 60, commission: 5, portalUrl: "https://civilsupplieskerala.gov.in/" },
  { id: "48", name: "Ration Card Surrender Certificate", wallet: "BANK", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://civilsupplieskerala.gov.in/" },
  { id: "49", name: "Udyam Registration (MSME)", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "https://udyamregistration.gov.in/" },
  { id: "50", name: "FSSAI Food License Registration", wallet: "BANK", deptFee: 100, srvCharge: 150, commission: 5, portalUrl: "https://foscos.fssai.gov.in/" },
  { id: "51", name: "E-Shram Card Registration", wallet: "CASH", deptFee: 0, srvCharge: 40, commission: 5, portalUrl: "https://eshram.gov.in/" },
  { id: "52", name: "PM Kisan Samman Nidhi Registration", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://pmkisan.gov.in/" },
  { id: "53", name: "K-FON Broadband Application", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "54", name: "Driving Licence Renewal", wallet: "BANK", deptFee: 200, srvCharge: 100, commission: 5, portalUrl: "https://parivahan.gov.in/" },
  { id: "55", name: "Learners Licence Application", wallet: "BANK", deptFee: 150, srvCharge: 100, commission: 5, portalUrl: "https://parivahan.gov.in/" },
  { id: "56", name: "International Driving Permit (IDP)", wallet: "BANK", deptFee: 1000, srvCharge: 200, commission: 5, portalUrl: "https://parivahan.gov.in/" },
  { id: "57", name: "Vehicle Ownership Transfer", wallet: "BANK", deptFee: 300, srvCharge: 150, commission: 5, portalUrl: "https://parivahan.gov.in/" },
  { id: "58", name: "Vehicle Fitness Certificate", wallet: "BANK", deptFee: 600, srvCharge: 150, commission: 5, portalUrl: "https://parivahan.gov.in/" },
  { id: "59", name: "Property Mutation (Pokkuvaravu)", wallet: "BANK", deptFee: 50, srvCharge: 100, commission: 5, portalUrl: "https://elam.kerala.gov.in/" },
  { id: "60", name: "Land Tax Payment Online", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 2, portalUrl: "https://www.revenue.kerala.gov.in/" },
  { id: "61", name: "Encumbrance Certificate (EC)", wallet: "BANK", deptFee: 50, srvCharge: 60, commission: 5, portalUrl: "https://pearl.registration.kerala.gov.in/" },
  { id: "62", name: "Certified Copy of Deed", wallet: "BANK", deptFee: 100, srvCharge: 80, commission: 5, portalUrl: "https://pearl.registration.kerala.gov.in/" },
  { id: "63", name: "Marriage Registration (Common)", wallet: "BANK", deptFee: 100, srvCharge: 150, commission: 5, portalUrl: "https://marriage.lsgkerala.gov.in/" },
  { id: "64", name: "Marriage Registration (Hindu)", wallet: "BANK", deptFee: 100, srvCharge: 150, commission: 5, portalUrl: "https://reg.kerala.gov.in/" },
  { id: "65", name: "Death Certificate", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "66", name: "Electricity New Connection", wallet: "BANK", deptFee: 500, srvCharge: 200, commission: 5, portalUrl: "https://kseb.in/" },
  { id: "67", name: "Water New Connection", wallet: "BANK", deptFee: 500, srvCharge: 200, commission: 5, portalUrl: "" },
  { id: "68", name: "LPG Subsidy Linking", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 5, portalUrl: "https://www.mylpg.in/" },
  { id: "69", name: "NEET Exam Registration", wallet: "BANK", deptFee: 1700, srvCharge: 150, commission: 5, portalUrl: "https://neet.nta.nic.in/" },
  { id: "70", name: "CUET Exam Registration", wallet: "BANK", deptFee: 1000, srvCharge: 150, commission: 5, portalUrl: "https://cuet.samarth.ac.in/" },
  { id: "71", name: "KEAM Application", wallet: "BANK", deptFee: 900, srvCharge: 150, commission: 5, portalUrl: "https://cee.kerala.gov.in/" },
  { id: "72", name: "PSC One Time Registration", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "https://thulasi.psc.kerala.gov.in/" },
  { id: "73", name: "PSC Exam Application", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://thulasi.psc.kerala.gov.in/" },
  { id: "74", name: "UPSC Civil Services Application", wallet: "BANK", deptFee: 100, srvCharge: 200, commission: 5, portalUrl: "https://upsconline.nic.in/" },
  { id: "75", name: "SSC CGL / CHSL Application", wallet: "BANK", deptFee: 100, srvCharge: 150, commission: 5, portalUrl: "https://ssc.nic.in/" },
  { id: "76", name: "RRB Railway Exam Application", wallet: "BANK", deptFee: 500, srvCharge: 150, commission: 5, portalUrl: "https://www.rrbcdg.gov.in/" },
  { id: "77", name: "IBPS Banking Exam Application", wallet: "BANK", deptFee: 850, srvCharge: 150, commission: 5, portalUrl: "https://www.ibps.in/" },
  { id: "78", name: "Scholarship Application (DCE)", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "https://dcescholarship.kerala.gov.in/" },
  { id: "79", name: "Scholarship Application (E-Grantz)", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "https://egrantz.kerala.gov.in/" },
  { id: "80", name: "National Scholarship Portal (NSP)", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "https://scholarships.gov.in/" },
  { id: "81", name: "Income Tax Return Filing (ITR-1)", wallet: "CASH", deptFee: 0, srvCharge: 500, commission: 5, portalUrl: "https://www.incometax.gov.in/" },
  { id: "82", name: "Income Tax Return Filing (ITR-4)", wallet: "CASH", deptFee: 0, srvCharge: 800, commission: 5, portalUrl: "https://www.incometax.gov.in/" },
  { id: "83", name: "GST Registration", wallet: "CASH", deptFee: 0, srvCharge: 1000, commission: 5, portalUrl: "https://www.gst.gov.in/" },
  { id: "84", name: "GST Monthly Return Filing", wallet: "CASH", deptFee: 0, srvCharge: 300, commission: 5, portalUrl: "https://www.gst.gov.in/" },
  { id: "85", name: "EPF Member Passbook Download", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 5, portalUrl: "https://www.epfindia.gov.in/" },
  { id: "86", name: "EPF UAN Activation & KYC", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://www.epfindia.gov.in/" },
  { id: "87", name: "ESIC Portal Services", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://www.esic.nic.in/" },
  { id: "88", name: "Police Verification Report (PVR)", wallet: "BANK", deptFee: 250, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "89", name: "Arms License Application", wallet: "BANK", deptFee: 1000, srvCharge: 500, commission: 5, portalUrl: "" },
  { id: "90", name: "Fire NOC Application", wallet: "BANK", deptFee: 500, srvCharge: 300, commission: 5, portalUrl: "" },
  { id: "91", name: "Food Safety Annual Return", wallet: "BANK", deptFee: 100, srvCharge: 200, commission: 5, portalUrl: "https://foscos.fssai.gov.in/" },
  { id: "92", name: "Trade License Renewal", wallet: "BANK", deptFee: 200, srvCharge: 150, commission: 5, portalUrl: "" },
  { id: "93", name: "Building Permit Application", wallet: "BANK", deptFee: 1000, srvCharge: 500, commission: 5, portalUrl: "https://sanketham.lsgkerala.gov.in/" },
  { id: "94", name: "Ownership Transfer of Building", wallet: "BANK", deptFee: 200, srvCharge: 150, commission: 5, portalUrl: "" },
  { id: "95", name: "Panchayat/Municipality Tax Assessment", wallet: "CASH", deptFee: 0, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "96", name: "Professional Tax Payment", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 2, portalUrl: "" },
  { id: "97", name: "Veterinary Pet Registration", wallet: "BANK", deptFee: 50, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "98", name: "Sub-Collector Court Case Status", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "99", name: "Legal Heir Certificate", wallet: "BANK", deptFee: 50, srvCharge: 100, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "100", name: "Dependency Certificate", wallet: "BANK", deptFee: 30, srvCharge: 50, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "101", name: "Possession & Non-Attachment Certificate", wallet: "BANK", deptFee: 30, srvCharge: 50, commission: 5, portalUrl: "https://e-district.kerala.gov.in/" },
  { id: "102", name: "Silviculture / Tree Cutting Permit", wallet: "BANK", deptFee: 100, srvCharge: 200, commission: 5, portalUrl: "" },
  { id: "103", name: "Fisheries ID Card Application", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "104", name: "Handloom Weavers ID Card", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "105", name: "Toddy Tappers Welfare Fund Services", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "" },
  { id: "106", name: "KSEB Solar Rooftop Subsidy Application", wallet: "CASH", deptFee: 0, srvCharge: 200, commission: 5, portalUrl: "https://www.pmsuryaghar.gov.in/" },
  { id: "107", name: "AAY / PHH Ration Card Split", wallet: "BANK", deptFee: 0, srvCharge: 80, commission: 5, portalUrl: "https://civilsupplieskerala.gov.in/" },
  { id: "108", name: "Ration Card Cancellation", wallet: "BANK", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://civilsupplieskerala.gov.in/" },
  { id: "109", name: "Duplicate SSLC Certificate Apply", wallet: "BANK", deptFee: 200, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "110", name: "Plus Two Certificate Verification", wallet: "BANK", deptFee: 150, srvCharge: 100, commission: 5, portalUrl: "" },
  { id: "111", name: "University Degree Certificate Attestation", wallet: "BANK", deptFee: 500, srvCharge: 200, commission: 5, portalUrl: "" },
  { id: "112", name: "MEA Attestation Online Processing", wallet: "BANK", deptFee: 500, srvCharge: 300, commission: 5, portalUrl: "https://www.mea.gov.in/" },
  { id: "113", name: "Apostille Attestation Services", wallet: "BANK", deptFee: 1000, srvCharge: 400, commission: 5, portalUrl: "" },
  { id: "114", name: "Railway Ticket Booking (IRCTC)", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 10, portalUrl: "https://www.irctc.co.in/" },
  { id: "115", name: "Flight Ticket Booking", wallet: "CASH", deptFee: 0, srvCharge: 200, commission: 20, portalUrl: "" },
  { id: "116", name: "Bus Ticket Booking (KSRTC/Private)", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 5, portalUrl: "" },
  { id: "117", name: "Fastag Recharge Services", wallet: "CASH", deptFee: 0, srvCharge: 20, commission: 2, portalUrl: "" },
  { id: "118", name: "Mobile / DTH Recharge", wallet: "CASH", deptFee: 0, srvCharge: 10, commission: 2, portalUrl: "" },
  { id: "119", name: "PAN-Aadhaar Linking Check", wallet: "CASH", deptFee: 0, srvCharge: 30, commission: 5, portalUrl: "https://www.incometax.gov.in/" },
  { id: "120", name: "NAD / ABC ID Creation (Academic Bank of Credits)", wallet: "CASH", deptFee: 0, srvCharge: 50, commission: 5, portalUrl: "https://www.abc.gov.in/" },
  { id: "121", name: "DigiLocker Account Creation & Document Fetch", wallet: "CASH", deptFee: 0, srvCharge: 40, commission: 5, portalUrl: "https://www.digilocker.gov.in/" }
];

export default function ServiceManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [walletOptions, setWalletOptions] = useState<string[]>(['CASH', 'BANK', 'Edistrict', 'CSC']);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newWallet, setNewWallet] = useState('CASH');
  const [newDeptFee, setNewDeptFee] = useState(0);
  const [newSrvCharge, setNewSrvCharge] = useState(0);
  // Commission is stored as a percentage of the service charge (e.g. 5 = 5%).
  const [newCommission, setNewCommission] = useState(5);
  const [newFollowupDays, setNewFollowupDays] = useState(0);
  const [newPortalUrl, setNewPortalUrl] = useState('');

  // വാലറ്റ് മാനേജ്മെന്റ് പേജിൽ ഉപയോഗിക്കുന്ന പ്രധാന കീ ആയ 'wallets' (അല്ലെങ്കിൽ മറ്റ് സ്റ്റോറേജ് കീകൾ) കൃത്യമായി റീഡ് ചെയ്ത് വാലറ്റ് പേരുകൾ എടുക്കുന്നു
  const fetchWallets = () => {
    if (typeof window !== 'undefined') {
      let walletNames: string[] = [];

      // നിങ്ങളുടെ Wallet Management പേജ് സേവ് ചെയ്യാൻ സാധ്യതയുള്ള പ്രധാന കീ 'wallets' പരിശോധിക്കുന്നു
      const savedWalletsData = localStorage.getItem('wallets');
      
      if (savedWalletsData) {
        try {
          const parsed = JSON.parse(savedWalletsData);
          if (Array.isArray(parsed)) {
            walletNames = parsed.map((item: any) => {
              if (typeof item === 'string') return item;
              // വാലറ്റ് ഒബ്ജക്റ്റുകളിൽ നിന്ന് നാമങ്ങൾ എടുക്കുന്നു (ഉദാ: name, walletName തുടങ്ങിയ പ്രോപ്പർട്ടികൾ)
              return item.name || item.walletName || item.title || item.wallet || '';
            }).filter(Boolean);
          }
        } catch (e) {
          console.error("Error parsing wallets from localStorage:", e);
        }
      }

      // ഒരുവേള 'wallets' കീയിൽ ഡാറ്റ ഇല്ലെങ്കിൽ മറ്റ് കീകളും പരിശോധിക്കാം
      if (walletNames.length === 0) {
        const alternativeKeys = ['walletList', 'managedWallets', 'userWallets'];
        for (const key of alternativeKeys) {
          const altData = localStorage.getItem(key);
          if (altData) {
            try {
              const parsedAlt = JSON.parse(altData);
              if (Array.isArray(parsedAlt)) {
                walletNames = parsedAlt.map((item: any) => {
                  if (typeof item === 'string') return item;
                  return item.name || item.walletName || item.title || item.wallet || '';
                }).filter(Boolean);
                if (walletNames.length > 0) break;
              }
            } catch (err) {
              console.error("Error parsing alt key", key, err);
            }
          }
        }
      }

      // വാലറ്റ് മാനേജ്മെന്റിൽ നിന്ന് കിട്ടിയ പേരുകൾ മാത്രം സെറ്റ് ചെയ്യുന്നു. 
      // ഒരു വാലറ്റും കിട്ടിയില്ലെങ്കിൽ മാത്രം 'CASH' നൽകുന്നു.
      if (walletNames.length > 0) {
        // ഡ്യൂപ്ലിക്കേറ്റുകൾ ഒഴിവാക്കാൻ Set ഉപയോഗിക്കുന്നു
        setWalletOptions(Array.from(new Set(walletNames)));
      } else {
        setWalletOptions(['CASH', 'BANK', 'Edistrict', 'CSC']);
      }
    }
  };

const fetchServices = () => {
  console.log("=== fetchServices START ===");

  if (typeof window === "undefined") return;

  try {
    const data = localStorage.getItem("managedServices");

    console.log("Current managedServices:", data);
    console.log("Default services count:", initialServices.length);

    let storedServices: ServiceItem[] = [];

    if (data) {
      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        storedServices = parsed;
      }
    }

    /*
     * Keep existing saved services/edits.
     * Add any missing default services from initialServices.
     */
    const storedById = new Map(
      storedServices.map((service: ServiceItem) => [
        String(service.id),
        service,
      ])
    );

    const storedByName = new Map(
      storedServices.map((service: ServiceItem) => [
        service.name.trim().toLowerCase(),
        service,
      ])
    );

    const mergedServices: ServiceItem[] = [...storedServices];

    initialServices.forEach((defaultService) => {
      const existsById = storedById.has(String(defaultService.id));
      const existsByName = storedByName.has(
        defaultService.name.trim().toLowerCase()
      );

      if (!existsById && !existsByName) {
        mergedServices.push(defaultService);
      }
    });

    /*
     * If old/corrupted localStorage contained only a small
     * subset of the default service list, repair it automatically.
     */
    if (
      storedServices.length === 0 ||
      mergedServices.length !== storedServices.length
    ) {
      localStorage.setItem(
        "managedServices",
        JSON.stringify(mergedServices)
      );
    }

    console.log(
      "Final managedServices count:",
      mergedServices.length
    );

    setServices(mergedServices);
  } catch (error) {
    console.error("Error loading managedServices:", error);

    localStorage.setItem(
      "managedServices",
      JSON.stringify(initialServices)
    );

    setServices(initialServices);
  }
};
useEffect(() => {
  console.log("Service Management Mounted");

  fetchServices();
  fetchWallets();

  console.log(
    "managedServices after fetch:",
    localStorage.getItem("managedServices")
  );
}, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchServices();
    fetchWallets();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleSubmitService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      alert("Please enter a service name!");
      return;
    }

    if (editingServiceId) {
      const updatedServices = services.map(service => {
        if (service.id === editingServiceId) {
          return {
            ...service,
            name: newName,
            wallet: newWallet,
            deptFee: Number(newDeptFee),
            srvCharge: Number(newSrvCharge),
            commission: Number(newCommission),
            followupDays: Number(newFollowupDays),
            portalUrl: newPortalUrl || undefined
          };
        }
        return service;
      });

      localStorage.setItem('managedServices', JSON.stringify(updatedServices));
      setServices(updatedServices);
    } else {
      const newService: ServiceItem = {
        id: Date.now().toString(),
        name: newName,
        wallet: newWallet,
        deptFee: Number(newDeptFee),
        srvCharge: Number(newSrvCharge),
        commission: Number(newCommission),
        followupDays: Number(newFollowupDays),
        portalUrl: newPortalUrl || undefined,
        isPinned: false
      };

      const updatedServices = [newService, ...services];
      localStorage.setItem('managedServices', JSON.stringify(updatedServices));
      setServices(updatedServices);
    }

    handleCloseModal();
  };

  const handleOpenAddModal = () => {
    fetchWallets();
    setEditingServiceId(null);
    setNewName('');
    setNewWallet(walletOptions[0] || 'CASH');
    setNewDeptFee(0);
    setNewSrvCharge(0);
    setNewCommission(5);
    setNewFollowupDays(0);
    setNewPortalUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    fetchWallets();
    setEditingServiceId(service.id);
    setNewName(service.name);
    setNewWallet(service.wallet || walletOptions[0] || 'CASH');
    setNewDeptFee(service.deptFee);
    setNewSrvCharge(service.srvCharge);
    setNewCommission(
      Number.isFinite(Number(service.commission)) ? Number(service.commission) : 5
    );
    setNewFollowupDays(service.followupDays || 0);
    setNewPortalUrl(service.portalUrl || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingServiceId(null);
  };

  const handleTogglePin = (id: string) => {
    const updatedServices = services.map(service => {
      if (service.id === id) {
        const newPinState = !service.isPinned;
        return { ...service, isPinned: newPinState };
      }
      return service;
    });
    localStorage.setItem('managedServices', JSON.stringify(updatedServices));
    setServices(updatedServices);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      const updated = services.filter(s => s.id !== id);
      localStorage.setItem('managedServices', JSON.stringify(updated));
      setServices(updated);
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredServices = (normalizedSearch
    ? services.filter((service) => {
        const name = String(service.name ?? "").toLowerCase();
        const wallet = String(service.wallet ?? "").toLowerCase();
        return name.includes(normalizedSearch) || wallet.includes(normalizedSearch);
      })
    : services
  ).sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
      sensitivity: "base",
      numeric: true,
    })
  );

  const serviceGroups = filteredServices.reduce<Record<string, ServiceItem[]>>(
    (groups, service) => {
      const firstLetter = String(service.name ?? "").trim().charAt(0).toUpperCase() || "#";
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
      (groups[letter] ||= []).push(service);
      return groups;
    },
    {}
  );
  const serviceGroupLetters = Object.keys(serviceGroups).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="relative mx-auto w-full max-w-[1600px] space-y-5 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-4 sm:p-5 lg:p-6">
      
      {/* Header Section */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
        <h3 className="text-2xl font-black tracking-tight text-slate-900">Service Management</h3>
        <button 
          onClick={handleRefresh}
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-600"
        >
          <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Total Services Banner */}
      <div className="relative flex items-center justify-between overflow-hidden rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-5 text-white shadow-[0_20px_55px_rgba(15,23,42,0.18)] sm:p-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/80">Total Services</p>
          <h2 className="mt-1 text-5xl font-black tracking-tight sm:text-6xl">{filteredServices.length}</h2>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 px-5 py-3.5 backdrop-blur-xl">
          <div className="rounded-xl bg-white/10 p-2.5 text-cyan-200">
            <Briefcase size={22} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-black tracking-tight text-white">{filteredServices.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/70">Records Found</p>
          </div>
        </div>
      </div>

      {/* Search & List Title */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-base font-black text-slate-800">
          <span>Service List</span>
          <button onClick={handleRefresh} className="text-slate-400 transition hover:text-cyan-600">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Search by name or wallet..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Services Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <th className="py-4 px-6 w-1/3">Service Name</th>
                <th className="py-4 px-4">Default Wallet</th>
                <th className="py-4 px-4 text-center">Dept Fee</th>
                <th className="py-4 px-4 text-center">Srv Charge</th>
                <th className="py-4 px-4 text-center">Commission</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredServices.length > 0 ? (
                serviceGroupLetters.map((letter) => (
                    serviceGroups[letter].map((service) => (
                  <tr key={service.id} className="transition hover:bg-cyan-50/30">
                    <td className="py-4 px-6">
                      <div className="font-black text-slate-800">{service.name}</div>
                      {service.portalUrl && (
                        <a 
                          href={service.portalUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-cyan-600 hover:underline"
                        >
                          Visit Portal <ExternalLink size={10} />
                        </a>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black tracking-wide text-slate-600">
                        {service.wallet || 'CASH'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-500">₹{service.deptFee}</td>
                    <td className="px-4 py-4 text-center font-bold text-slate-800">₹{service.srvCharge}</td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600">{Number(service.commission ?? 5)}%</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleTogglePin(service.id)}
                          title={service.isPinned ? "Unpin from Dashboard" : "Pin to Dashboard"}
                          className={`p-1.5 rounded transition ${
                            service.isPinned 
                              ? 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200' 
                              : 'text-slate-400 hover:bg-cyan-50 hover:text-cyan-600'
                          }`}
                        >
                          <Bookmark size={14} fill={service.isPinned ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(service)}
                          title="Edit Service"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(service.id)}
                          title="Delete Service"
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                    ))
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    No services found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Plus Button */}
      <button 
        onClick={handleOpenAddModal}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-4 text-white shadow-[0_14px_35px_rgba(6,182,212,0.28)] transition-all hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(37,99,235,0.28)] active:scale-95"
      >
        <Plus size={24} />
      </button>

      {/* MODAL POPUP FOR ADD / EDIT SERVICE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 px-3 py-3 backdrop-blur-md sm:px-4">
          <div className="w-full max-w-lg max-h-[calc(100vh-24px)] overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.22)] backdrop-blur-2xl sm:p-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-base font-black text-cyan-600">
                <Briefcase size={20} />
                <h4 className="text-base font-black text-slate-800">
                  {editingServiceId ? "Edit Service" : "Add New Service"}
                </h4>
              </div>
              <button onClick={handleCloseModal} className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Service Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Passport Application"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Webpage URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  value={newPortalUrl}
                  onChange={(e) => setNewPortalUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dept Fee (₹)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    value={newDeptFee || ''}
                    onChange={(e) => setNewDeptFee(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Srv Charge (₹)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    value={newSrvCharge || ''}
                    onChange={(e) => setNewSrvCharge(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Commission (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    value={newCommission}
                    onChange={(e) => setNewCommission(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  />
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">Percentage of service charge</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Default Wallet</label>
                  <select 
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    value={newWallet}
                    onChange={(e) => setNewWallet(e.target.value)}
                  >
                    {walletOptions.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Followup Days</label>
                  <input 
                    type="number" 
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                    value={newFollowupDays || 0}
                    onChange={(e) => setNewFollowupDays(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="pt-1">
                <button 
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-xs font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  {editingServiceId ? "Update Service" : "Add Service"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}