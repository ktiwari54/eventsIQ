import Link from "next/link";

const features = [
  {
    icon: "⚡",
    title: "AI Lead Scoring",
    desc: "Score every lead instantly with our AI engine. Grade A+ to D based on 7 buying signals.",
  },
  {
    icon: "📊",
    title: "Event ROI Tracking",
    desc: "Know exactly which events drive revenue. Track cost-per-lead, conversion rates, and ROI per event.",
  },
  {
    icon: "🔗",
    title: "CRM Integration",
    desc: "Bidirectional Zoho CRM sync. Leads flow in and out automatically — no manual exports.",
  },
  {
    icon: "📱",
    title: "Multi-Source Lead Capture",
    desc: "Capture leads via QR scan, business card OCR, CSV upload, web forms, or manual entry.",
  },
  {
    icon: "💰",
    title: "Budget Management",
    desc: "Plan budgets, track expenses, and get approval workflows — all in one place.",
  },
  {
    icon: "🤖",
    title: "AI Copilot",
    desc: "Ask your event data anything. Get instant insights on performance, trends, and next steps.",
  },
];

const stats = [
  { value: "500+", label: "Companies" },
  { value: "2M+", label: "Leads Captured" },
  { value: "4.8×", label: "Avg ROI Improvement" },
  { value: "99.9%", label: "Uptime SLA" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-slate-100">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="text-accent text-xl font-extrabold">⚡ EVENT IQ</div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted">
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost text-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary text-sm">Start Free Trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block bg-accent/10 border border-accent/30 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-6">
          14-day free trial · No credit card required
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 max-w-4xl mx-auto">
          Turn Every Event into{" "}
          <span className="text-accent">Measurable Revenue</span>
        </h1>
        <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10">
          EventIQ captures leads, scores them with AI, syncs your CRM, and tracks
          ROI across every trade show, conference, and campaign — so you stop
          guessing and start growing.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="btn btn-primary px-8 py-3 text-base">
            Start Free Trial
          </Link>
          <Link href="/pricing" className="btn btn-ghost px-8 py-3 text-base">
            See Pricing
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-card border-y border-border py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-accent">{s.value}</div>
              <div className="text-sm text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Everything you need to run event-led growth</h2>
          <p className="text-muted max-w-xl mx-auto">
            From lead capture on the floor to revenue attribution in your CRM — EventIQ handles the full lifecycle.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card hover:border-accent/50 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-card border-y border-border py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to prove your event ROI?</h2>
        <p className="text-muted mb-8 max-w-lg mx-auto">
          Join 500+ B2B teams already using EventIQ. Set up in under 10 minutes.
        </p>
        <Link href="/signup" className="btn btn-primary px-10 py-3 text-base inline-block">
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between text-sm text-muted">
        <div className="font-bold text-white mb-4 md:mb-0">⚡ EVENT IQ</div>
        <div className="flex gap-6">
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        <div className="mt-4 md:mt-0">© 2025 EventIQ. All rights reserved.</div>
      </footer>
    </div>
  );
}
