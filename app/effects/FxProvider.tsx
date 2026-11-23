"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Elements that get the entrance reveal / glow / tilt / press effects automatically.
const REVEAL = ".nhSec, .nhSvc, .nhStep, .nhBox, .nhStatus, .nhPoster, .lgFeature";
const GLOW = ".nhSvc, .nhStep, .nhBox, .lgFeature";
const TILT = ".nhSvc, .lgFeature";
const PRESS = ".nhBtn, .lgLogin, .nhCam";

export default function FxProvider() {
  const pathname = usePathname();
  const showSplash = pathname === "/" || pathname === "/login";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const wide = window.innerWidth > 820;
    const root = document.documentElement;
    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        el.classList.add("fx-in");
        window.setTimeout(() => el.classList.remove("fx-reveal", "fx-in"), 1200);
      });
    }, { threshold: 0.12 });

    const prepare = () => {
      document.querySelectorAll<HTMLElement>(REVEAL).forEach((el, i) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Already on screen: leave visible (avoids a flash); only reveal what is below the fold.
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
        el.style.setProperty("--fx-d", `${(i % 4) * 80}ms`);
        el.classList.add("fx-reveal");
        io.observe(el);
      });
      if (fine) document.querySelectorAll<HTMLElement>(GLOW).forEach(el => el.classList.add("fx-glow"));
      document.querySelectorAll<HTMLElement>(PRESS).forEach(el => el.classList.add("fx-press"));
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(prepare);
    };
    prepare();
    // Cards that render later (for example the services list after it loads).
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });

    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.(".fx-glow") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      if (el.matches(TILT)) {
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translateY(-5px)`;
      }
    };
    const onOut = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.(".fx-glow") as HTMLElement | null;
      if (el && !el.contains(e.relatedTarget as Node | null)) el.style.transform = "";
    };
    if (fine) {
      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        root.style.setProperty("--fx-py", String(window.scrollY));
        ticking = false;
      });
    };
    if (wide) window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return showSplash ? (
    <div className="fxSplash" aria-hidden="true">
      <img src="/akshaya-logo.png" alt="" />
      <span className="fxBar" />
    </div>
  ) : null;
}
