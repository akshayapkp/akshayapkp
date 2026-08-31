"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { hashPassword, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSigningIn) return;

    setIsSigningIn(true);

    let isValid = false;
    let assignedRole = "staff";
    let displayName = "";

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    /*
     * ---------------------------------------------------------
     * ADMIN LOGIN
     * ---------------------------------------------------------
     */
    if (cleanUsername === "admin" && cleanPassword === "admin") {
      isValid = true;
      assignedRole = "admin";
      displayName = "Admin User";
    } else {
      /*
       * -------------------------------------------------------
       * STAFF LOGIN - SUPABASE
       * -------------------------------------------------------
       */
      try {
        const passwordHash = await hashPassword(cleanPassword);

        const { data: staffRecords, error: staffError } = await supabase
          .from("staff")
          .select("id, staff_id, name, email, role, password");

        if (staffError) {
          console.error("Staff login database error:", staffError);
        } else {
          const matchedStaff = (staffRecords ?? []).find((staff: any) => {
            const staffName = String(staff.name ?? "")
              .trim()
              .toLowerCase();

            const staffUsername = String(staff.username ?? "")
              .trim()
              .toLowerCase();

            const staffEmail = String(staff.email ?? "")
              .trim()
              .toLowerCase();

            const staffId = String(
              staff.staff_id ?? staff.staffId ?? staff.id ?? ""
            )
              .trim()
              .toLowerCase();

            const usernameMatches =
              cleanUsername === staffName ||
              cleanUsername === staffUsername ||
              cleanUsername === staffEmail ||
              cleanUsername === staffId;

            if (!usernameMatches) return false;

            const storedPassword = String(staff.password ?? "").trim();

            return (
              storedPassword === cleanPassword ||
              storedPassword === passwordHash
            );
          });

          if (matchedStaff) {
            isValid = true;

            const rawRole = String(matchedStaff.role ?? "")
              .trim()
              .toLowerCase();

            assignedRole =
              rawRole === "admin"
                ? "admin"
                : rawRole.includes("account")
                  ? "accountant"
                  : "staff";

            displayName =
              matchedStaff.name ||
              matchedStaff.email ||
              matchedStaff.staff_id ||
              "Staff";
          }
        }
      } catch (error) {
        console.error("Staff login failed:", error);
      }

      /*
       * -------------------------------------------------------
       * FALLBACK - LOCAL STAFF STORAGE
       * -------------------------------------------------------
       */
      if (!isValid) {
        try {
          const savedStaffData = localStorage.getItem(
            "smart_akshaya_staff"
          );

          if (savedStaffData) {
            const parsed = JSON.parse(savedStaffData);

            const staffArray = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed?.staff)
                ? parsed.staff
                : Array.isArray(parsed?.staffs)
                  ? parsed.staffs
                  : Array.isArray(parsed?.data)
                    ? parsed.data
                    : [];

            const passwordHash = await hashPassword(cleanPassword);

            const matchedStaff = staffArray.find((s: any) => {
              if (!s || typeof s !== "object") return false;

              const staffName = String(
                s.name ?? s.staffName ?? ""
              )
                .trim()
                .toLowerCase();

              const staffUsername = String(
                s.username ?? s.userName ?? ""
              )
                .trim()
                .toLowerCase();

              const staffEmail = String(s.email ?? "")
                .trim()
                .toLowerCase();

              const staffId = String(
                s.staffId ?? s.id ?? ""
              )
                .trim()
                .toLowerCase();

              const usernameMatches =
                cleanUsername === staffName ||
                cleanUsername === staffUsername ||
                cleanUsername === staffEmail ||
                cleanUsername === staffId;

              if (!usernameMatches) return false;

              const storedPassword = String(
                s.password ??
                  s.pass ??
                  s.staffPassword ??
                  s.loginPassword ??
                  s.newPassword ??
                  s.credentials?.password ??
                  ""
              ).trim();

              if (storedPassword !== "") {
                return (
                  storedPassword === cleanPassword ||
                  storedPassword === passwordHash
                );
              }

              const firstName =
                staffName.split(" ")[0] || "staff";

              const defaultPassword = `${firstName}akshaya`;

              return (
                cleanPassword.toLowerCase() ===
                  defaultPassword ||
                cleanPassword === "akshaya123"
              );
            });

            if (matchedStaff) {
              isValid = true;

              assignedRole =
                String(matchedStaff.role ?? "").toLowerCase() ===
                "admin"
                  ? "admin"
                  : "staff";

              displayName =
                matchedStaff.name ||
                matchedStaff.staffName ||
                matchedStaff.username ||
                matchedStaff.email ||
                matchedStaff.staffId ||
                "Staff";
            }
          }
        } catch (error) {
          console.error(
            "Error reading staff storage:",
            error
          );
        }
      }
    }

    /*
     * ---------------------------------------------------------
     * SUCCESS
     * ---------------------------------------------------------
     */
    if (isValid) {
      localStorage.setItem(
        "loggedInUser",
        JSON.stringify({
          username: displayName,
          role: assignedRole,
        })
      );

      localStorage.setItem(
        "loginSessionDate",
        new Date().toISOString().split("T")[0]
      );

      /*
       * No artificial 700ms delay.
       * Navigate immediately after successful login.
       */
      router.push("/dashboard");
    } else {
      setIsSigningIn(false);

      window.alert(
        "Invalid Username or Password. Please check your credentials."
      );
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: "24px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        fontFamily:
          '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        color: "#ffffff",
        background:
          "radial-gradient(circle at 15% 20%, rgba(0,198,255,0.16), transparent 32%), radial-gradient(circle at 85% 80%, rgba(124,58,237,0.18), transparent 35%), #0b0f19",
      }}
    >
      {/* -------------------------------------------------------
          BACKGROUND - STATIC
          No floating/entrance animation.
      ------------------------------------------------------- */}

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "420px",
          height: "420px",
          left: "-130px",
          top: "-100px",
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 35% 35%, rgba(0,198,255,0.85), rgba(0,114,255,0.35) 42%, transparent 72%)",
          filter: "blur(2px)",
          opacity: 0.75,
          zIndex: 0,
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          right: "-190px",
          bottom: "-180px",
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 40% 40%, rgba(139,92,246,0.8), rgba(236,72,153,0.28) 45%, transparent 72%)",
          filter: "blur(2px)",
          opacity: 0.75,
          zIndex: 0,
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(0,198,255,0.28), rgba(59,130,246,0.1) 48%, transparent 72%)",
          zIndex: 0,
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "220px",
          height: "220px",
          right: "12%",
          top: "12%",
          borderRadius: "50%",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(255,65,108,0.22), rgba(255,75,43,0.06) 55%, transparent 75%)",
          zIndex: 0,
        }}
      />

      {/* -------------------------------------------------------
          MAIN LOGIN CONTAINER
      ------------------------------------------------------- */}

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "560px",
          zIndex: 5,
        }}
      >
        <section
          style={{
            width: "100%",
            boxSizing: "border-box",
            position: "relative",
            padding: "44px 42px 38px",
            borderRadius: "30px",
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.045))",
            border:
              "1px solid rgba(255,255,255,0.14)",
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Top glow */}

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-20px",
              left: "50%",
              width: "200px",
              height: "200px",
              transform: "translateX(-50%)",
              borderRadius: "50%",
              background:
                "rgb(237, 240, 241)",
              filter: "blur(70px)",
              pointerEvents: "none",
            }}
          />

          {/* ---------------------------------------------------
              LOGO
              STATIC - NO ZOOM / NO ENTRANCE ANIMATION
          --------------------------------------------------- */}

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "34px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "150px",
                height: "125px",
                margin: "0 auto 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {/* Logo glow */}

              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  width: "180px",
                  height: "150px",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(255,255,255,0.24), rgba(249,251,253,0.10) 45%, transparent 100%)",
                  filter: "blur(22px)",
                  pointerEvents: "none",
                }}
              />

              <img
                src="/logo.png"
                alt="Company Logo"
                width={120}
                height={120}
                draggable={false}
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "block",
                  width: "120px",
                  height: "120px",
                  objectFit: "contain",
                  flexShrink: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                  borderRadius: "14px",
                  filter:
                    "drop-shadow(0 12px 20px rgba(0,198,255,0.25)) drop-shadow(0 0 18px rgba(0,114,255,0.18))",
                }}
              />
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "36px",
                lineHeight: 1.2,
                fontWeight: 700,
                letterSpacing: "-0.6px",
                textAlign: "center",
                background:
                  "linear-gradient(135deg, #ffffff 0%, #b9efff 45%, #8ab4ff 75%, #ffffff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Welcome Back
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(226,232,240,0.75)",
                fontSize: "16px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              Sign in to your Akshaya Pookiparamba Account
            </p>
          </div>

          {/* ---------------------------------------------------
              LOGIN FORM
          --------------------------------------------------- */}

          <form
            onSubmit={handleLogin}
            style={{
              position: "relative",
              zIndex: 3,
              width: "100%",
            }}
          >
            {/* Username */}

            <div
              style={{
                position: "relative",
                marginBottom: "18px",
              }}
            >
              <input
                type="text"
                placeholder="Staff Name / Username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                autoComplete="username"
                required
                disabled={isSigningIn}
                style={{
                  width: "100%",
                  height: "62px",
                  boxSizing: "border-box",
                  padding: "0 20px",
                  background:
                    "rgba(255,255,255,0.07)",
                  border:
                    "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "15px",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 500,
                  outline: "none",
                }}
              />
            </div>

            {/* Password */}

            <div
              style={{
                position: "relative",
                marginBottom: "18px",
              }}
            >
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
                disabled={isSigningIn}
                style={{
                  width: "100%",
                  height: "62px",
                  boxSizing: "border-box",
                  padding: "0 20px",
                  background:
                    "rgba(255,255,255,0.07)",
                  border:
                    "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "15px",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 500,
                  outline: "none",
                }}
              />
            </div>

            {/* Sign In */}

            <button
              type="submit"
              disabled={isSigningIn}
              style={{
                position: "relative",
                width: "100%",
                height: "62px",
                border: "none",
                borderRadius: "15px",
                background:
                  "linear-gradient(135deg, #00c6ff 0%, #0072ff 45%, #6d28d9 100%)",
                color: "#ffffff",
                fontSize: "17px",
                fontWeight: 700,
                letterSpacing: "0.3px",
                cursor: isSigningIn
                  ? "wait"
                  : "pointer",
                boxShadow:
                  "0 12px 32px rgba(0,114,255,0.32), inset 0 1px 0 rgba(255,255,255,0.25)",
                opacity: isSigningIn ? 0.75 : 1,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "9px",
                }}
              >
                {isSigningIn ? (
                  <>
                    <span
                      style={{
                        width: "17px",
                        height: "17px",
                        border:
                          "2px solid rgba(255,255,255,0.35)",
                        borderTopColor: "#ffffff",
                        borderRadius: "50%",
                        display: "inline-block",
                      }}
                    />

                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </span>
            </button>
          </form>
        </section>
      </div>

      {/* -------------------------------------------------------
          MOBILE
      ------------------------------------------------------- */}

      <style jsx>{`
        input::placeholder {
          color: rgba(203, 213, 225, 0.58);
        }

        input:focus {
          background: rgba(255, 255, 255, 0.11) !important;
          border-color: rgba(0, 198, 255, 0.65) !important;
          box-shadow:
            0 0 0 4px rgba(0, 198, 255, 0.08),
            0 0 25px rgba(0, 114, 255, 0.15);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 16px 38px rgba(0, 114, 255, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
        }

        @media (max-width: 600px) {
          main {
            padding: 16px !important;
          }

          section {
            padding: 38px 22px 30px !important;
            border-radius: 26px !important;
          }

          h1 {
            font-size: 30px !important;
          }

          p {
            font-size: 14px !important;
          }

          input {
            height: 56px !important;
            font-size: 15px !important;
          }

          button {
            height: 56px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
    </main>
  );
}