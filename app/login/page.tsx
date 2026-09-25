"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { hashPassword, supabase } from "@/lib/supabase";
import { getLocalDateKey } from "@/lib/session-date";
import styles from "./login.module.css";

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6M16 14h.01"/></>,
    chart: <><path d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16V5M20 16v-3"/></>,
    staff: <><circle cx="12" cy="7" r="4"/><path d="M5 21a7 7 0 0 1 14 0M19 8h3M20.5 6.5v3"/></>,
    report: <><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M4 19h16M8 15v-3M12 15V8M16 15v-5"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    heart: <path d="M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.8 2.6Z"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  };
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const features = [["file", "Service Entry", "& Billing"], ["users", "Customers", "Management"], ["wallet", "Wallet &", "Transactions"], ["chart", "Expenses", "Tracking"], ["file", "Certificates &", "Applications"], ["staff", "Staff", "Management"], ["report", "Reports &", "Analytics"], ["gear", "And Many More...", ""]];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSigningIn) return;
    setIsSigningIn(true);
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    let isValid = cleanUsername === "admin" && cleanPassword === "admin";
    let assignedRole = isValid ? "admin" : "staff";
    let displayName = isValid ? "Admin User" : "";
    if (!isValid) {
      try {
        const passwordHash = await hashPassword(cleanPassword);
        const { data } = await supabase.from("staff").select("id, staff_id, name, email, role, password");
        const matched = (data ?? []).find((staff: any) => {
          const usernameMatches = [staff.name, staff.username, staff.email, staff.staff_id, staff.id].some(value => String(value ?? "").trim().toLowerCase() === cleanUsername);
          const storedPassword = String(staff.password ?? "").trim();
          return usernameMatches && (storedPassword === cleanPassword || storedPassword === passwordHash);
        });
        if (matched) {
          isValid = true;
          const matchedRole = String(matched.role ?? "").trim().toLowerCase();
          assignedRole = matchedRole === "admin"
            ? "admin"
            : matchedRole.includes("account")
              ? "accountant"
              : matchedRole.includes("online")
                ? "online_staff"
                : "staff";
          displayName = matched.name || matched.email || matched.staff_id || "Staff";
        }
      } catch (error) { console.error("Staff login failed:", error); }
      if (!isValid) {
        try {
          const saved = JSON.parse(localStorage.getItem("smart_akshaya_staff") || "[]");
          const staffArray = Array.isArray(saved) ? saved : saved?.staff || saved?.staffs || saved?.data || [];
          const matched = staffArray.find((staff: any) => {
            const usernameMatches = [staff.name, staff.staffName, staff.username, staff.userName, staff.email, staff.staffId, staff.id].some(value => String(value ?? "").trim().toLowerCase() === cleanUsername);
            const storedPassword = String(staff.password ?? staff.pass ?? staff.staffPassword ?? staff.loginPassword ?? "").trim();
            const firstName = cleanUsername.split(" ")[0] || "staff";
            return usernameMatches && (storedPassword ? storedPassword === cleanPassword : [cleanPassword.toLowerCase(), "akshaya123"].includes(`${firstName}akshaya`));
          });
          if (matched) {
            isValid = true;
            const matchedRole = String(matched.role ?? "").trim().toLowerCase();
            assignedRole = matchedRole === "admin"
              ? "admin"
              : matchedRole.includes("account")
                ? "accountant"
                : matchedRole.includes("online")
                  ? "online_staff"
                  : "staff";
            displayName = matched.name || matched.staffName || matched.username || matched.email || matched.staffId || "Staff";
          }
        } catch (error) { console.error("Local staff login failed:", error); }
      }
    }
    if (isValid) {
      localStorage.setItem("loggedInUser", JSON.stringify({ username: displayName, role: assignedRole }));
      localStorage.setItem("loginSessionDate", getLocalDateKey());
      router.push("/dashboard");
    } else { setIsSigningIn(false); window.alert("Invalid Username or Password. Please check your credentials."); }
  };

  return <main className={styles.page}>
    <div className={`${styles.orb} ${styles.orbOne}`} /><div className={`${styles.orb} ${styles.orbTwo}`} />
    <section className={styles.left}>
      <div className={styles.brandRow}><img src="/akshaya-logo.png" alt="Akshaya" className={styles.logo} /><div className={styles.divider} /><div><h1>Akshaya Centre</h1><h2>Pookiparamba</h2><p>Centre Management System</p><div className={styles.miniNav}>Manage Services <span>|</span> Customers <span>|</span> Payments <span>|</span> Staff</div><div className={styles.miniNav}>All in One Place</div></div></div>
      <div className={styles.script}>Digital Services<br />for a Better Tomorrow</div>
      <div className={styles.features}>{features.map(([icon, a, b], i) => <div className={styles.feature} key={i}><div className={`${styles.icon} ${styles[`i${i}`]}`}><Icon name={icon} /></div><strong>{a}</strong>{b && <strong>{b}</strong>}</div>)}</div>
      <div className={styles.office}><div className={styles.officeWall}><img src="/akshaya-logo.png" alt="" className={styles.officeLogo} /><div className={styles.wallText}>Service<br />Support<br />Empower<br />Grow</div><div className={styles.glassText}>Digital<br />Empowered<br />Communities</div></div><div className={styles.counter} /><div className={`${styles.chair} ${styles.chair1}`} /><div className={`${styles.chair} ${styles.chair2}`} /><div className={`${styles.plant} ${styles.plant1}`}>✦</div><div className={`${styles.plant} ${styles.plant2}`}>✦</div></div>
      <div className={styles.bottomBar}><div><Icon name="users" /><span><b>Efficient</b><br />Operations</span></div><div><Icon name="shield" /><span><b>Better</b><br />Service Delivery</span></div><div><Icon name="chart" /><span><b>Data Driven</b><br />Decisions</span></div><div><Icon name="heart" /><span><b>Stronger</b><br />Communities</span></div></div>
    </section>
    <section className={styles.right}><div className={styles.loginCard}><div className={styles.staffBadge}><Icon name="shield" /> Staff Access Only</div><img src="/akshaya-logo.png" alt="Akshaya" className={styles.cardLogo} /><h3>Welcome <span>Back!</span></h3><p className={styles.sub}>Sign in to your <b>Akshaya Centre Pookiparamba</b><br />Management System</p><p className={styles.helper}>Access your dashboard and manage your centre with ease.</p><form onSubmit={handleLogin}><label className={styles.input}><Icon name="user" /><input aria-label="Username / Staff ID" placeholder="Username / Staff ID" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required disabled={isSigningIn} /></label><label className={styles.input}><Icon name="lock" /><input aria-label="Password" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required disabled={isSigningIn} /><button type="button" className={styles.eye} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)}><Icon name="eye" /></button></label><label className={styles.remember}><input type="checkbox" /> <span>Remember me</span></label><button className={styles.login} type="submit" disabled={isSigningIn}>{isSigningIn ? "Signing in..." : "Login"} <Icon name="arrow" /></button></form><div className={styles.cardFooter}><span>Akshaya Centre Pookiparamba</span><span>Manage Today for a Smarter Tomorrow</span></div></div><div className={styles.rightQuote}>Digital<br />Services<br />for a Better<br />Tomorrow</div></section>
  </main>;
}
