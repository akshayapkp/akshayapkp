// Preview of the new look. Open /theme-preview after deploying.
// Delete this folder (app/theme-preview) once the design is approved.
const services = [
  { icon: "🪪", title: "Aadhaar services", note: "Update, status, download" },
  { icon: "💳", title: "PAN services", note: "New, correction, status" },
  { icon: "🛂", title: "Passport", note: "Apply and track" },
  { icon: "📜", title: "Certificates", note: "Income, caste, nativity" },
  { icon: "📷", title: "Photo studio", note: "Passport photo, resize" },
  { icon: "📄", title: "Resume builder", note: "Ready in minutes" },
];

export default function ThemePreview() {
  return (
    <main className="ak-page">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="ak-glass flex w-full items-center justify-between px-5 py-3">
          <strong style={{ color: "var(--ak-primary)" }}>Akshaya Pookiparamba</strong>
          <nav className="flex gap-3 text-sm" style={{ color: "var(--ak-muted)" }}>
            <span>Services</span>
            <span>Tools</span>
            <span>Track</span>
            <span>Contact</span>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-2">
        <div>
          <p className="mb-3 inline-block rounded-full px-3 py-1 text-sm font-semibold" style={{ background: "color-mix(in srgb, var(--ak-accent) 25%, transparent)", color: "var(--ak-ink)" }}>
            Your digital Akshaya centre
          </p>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            Government services,{" "}
            <span style={{ background: "linear-gradient(135deg, var(--ak-primary), var(--ak-secondary))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              simple and fast
            </span>
          </h1>
          <p className="mt-4 max-w-md" style={{ color: "var(--ak-muted)" }}>
            Apply, track and print everything from one place. No queues, clear document checklists.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="ak-btn ak-btn-primary" href="#">Start application</a>
            <a className="ak-btn ak-btn-accent" href="#">Track status</a>
            <a className="ak-btn" href="#">Contact us</a>
          </div>
        </div>

        <div className="ak-stage" aria-hidden="true">
          <div className="ak-stack">
            <div className="ak-layer ak-glass" />
            <div className="ak-layer ak-glass" />
            <div className="ak-layer ak-glass ak-glass-strong flex items-center justify-center text-6xl ak-float">🏛️</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="mb-5 text-2xl font-bold">Popular services</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(s => (
            <article key={s.title} className="ak-glass ak-tilt p-6">
              <div className="mb-3 text-3xl">{s.icon}</div>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--ak-muted)" }}>{s.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
