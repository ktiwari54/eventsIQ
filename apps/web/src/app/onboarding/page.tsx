"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Step = "welcome" | "crm" | "campaign" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "crm", label: "Connect CRM" },
  { id: "campaign", label: "First Campaign" },
  { id: "done", label: "Done" },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [crm, setCrm] = useState({ clientId: "", clientSecret: "" });
  const [skipCrm, setSkipCrm] = useState(false);
  const [campaign, setCampaign] = useState({ name: "", type: "TRADE_SHOW", startDate: "" });
  const [saving, setSaving] = useState(false);

  const currentIndex = STEPS.findIndex((s) => s.id === step);

  async function saveCrm() {
    if (skipCrm) { setStep("campaign"); return; }
    if (!crm.clientId || !crm.clientSecret) { setStep("campaign"); return; }
    setSaving(true);
    try {
      await fetch("/api/zoho/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: crm.clientId, clientSecret: crm.clientSecret }),
      });
    } finally {
      setSaving(false);
      setStep("campaign");
    }
  }

  async function saveCampaign() {
    if (!campaign.name || !campaign.startDate) { setStep("done"); return; }
    setSaving(true);
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign.name,
          type: campaign.type,
          startDate: campaign.startDate,
          endDate: campaign.startDate,
        }),
      });
    } finally {
      setSaving(false);
      setStep("done");
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-accent text-xl font-extrabold mb-2">⚡ EVENT IQ</div>
          <p className="text-muted text-sm">Let's get you set up in 2 minutes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < currentIndex
                    ? "bg-green text-bg"
                    : i === currentIndex
                    ? "bg-accent text-white"
                    : "bg-card border border-border text-muted"
                }`}
              >
                {i < currentIndex ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < currentIndex ? "bg-green" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="card">
          {step === "welcome" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-extrabold mb-2">
                Welcome{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
              </h2>
              <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
                Your account and 14-day trial are ready. Let's connect your CRM and create
                your first event campaign.
              </p>
              <button className="btn btn-primary px-8 py-2.5" onClick={() => setStep("crm")}>
                Get Started
              </button>
            </div>
          )}

          {step === "crm" && (
            <div>
              <h2 className="text-xl font-extrabold mb-1">Connect your CRM</h2>
              <p className="text-muted text-sm mb-6">
                Connect Zoho CRM to sync leads automatically. You can skip this and do it later.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                    Zoho Client ID
                  </label>
                  <input
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    placeholder="1000.XXXXXXXXXX"
                    value={crm.clientId}
                    onChange={(e) => setCrm((c) => ({ ...c, clientId: e.target.value }))}
                    disabled={skipCrm}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                    Zoho Client Secret
                  </label>
                  <input
                    type="password"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={crm.clientSecret}
                    onChange={(e) => setCrm((c) => ({ ...c, clientSecret: e.target.value }))}
                    disabled={skipCrm}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={skipCrm}
                    onChange={(e) => setSkipCrm(e.target.checked)}
                  />
                  <span className="text-sm text-muted">Skip for now — I'll connect later</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="btn btn-ghost flex-1" onClick={() => setStep("welcome")}>Back</button>
                <button
                  className="btn btn-primary flex-1 disabled:opacity-50"
                  disabled={saving}
                  onClick={saveCrm}
                >
                  {saving ? "Connecting…" : skipCrm ? "Skip" : "Connect & Continue"}
                </button>
              </div>
            </div>
          )}

          {step === "campaign" && (
            <div>
              <h2 className="text-xl font-extrabold mb-1">Create your first campaign</h2>
              <p className="text-muted text-sm mb-6">
                Add your first event or trade show. You can fill in all details later.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                    Campaign / Event Name
                  </label>
                  <input
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    placeholder="e.g. CES 2025, SaaStr Annual"
                    value={campaign.name}
                    onChange={(e) => setCampaign((c) => ({ ...c, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                    Event Type
                  </label>
                  <select
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    value={campaign.type}
                    onChange={(e) => setCampaign((c) => ({ ...c, type: e.target.value }))}
                  >
                    <option value="TRADE_SHOW">Trade Show</option>
                    <option value="CONFERENCE">Conference</option>
                    <option value="EXHIBITION">Exhibition</option>
                    <option value="BRAND_LAUNCH">Brand Launch</option>
                    <option value="ROADSHOW">Roadshow</option>
                    <option value="WEBINAR">Webinar</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                    value={campaign.startDate}
                    onChange={(e) => setCampaign((c) => ({ ...c, startDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button className="btn btn-ghost flex-1" onClick={() => setStep("crm")}>Back</button>
                <button
                  className="btn btn-primary flex-1 disabled:opacity-50"
                  disabled={saving}
                  onClick={saveCampaign}
                >
                  {saving ? "Creating…" : !campaign.name ? "Skip" : "Create & Continue"}
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-2xl font-extrabold mb-2">You're all set!</h2>
              <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
                Your workspace is ready. Head to the dashboard to capture leads, track ROI,
                and manage your events.
              </p>
              <button
                className="btn btn-primary px-8 py-2.5"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
