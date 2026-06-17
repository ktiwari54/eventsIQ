"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Tab = "profile" | "organization" | "billing";

const PLANS = [
  { tier: "STARTER",    name: "Starter",    price: 49,  users: "5 users",      leads: "500 leads",    color: "border-border" },
  { tier: "PRO",        name: "Pro",        price: 149, users: "15 users",     leads: "5,000 leads",  color: "border-accent" },
  { tier: "ENTERPRISE", name: "Enterprise", price: 399, users: "Unlimited",    leads: "Unlimited",    color: "border-purple-500" },
] as const;

type OrgData = {
  name: string;
  slug: string;
  _count: { users: number };
  subscription?: {
    status: string;
    billingCycle: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    plan: {
      name: string;
      tier: string;
      monthlyPrice: number;
      yearlyPrice: number;
      maxUsers: number;
      maxEvents: number;
      maxLeads: number;
    };
  };
};

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-semibold shadow-lg z-50 ${
        type === "success" ? "bg-green text-bg" : "bg-danger text-white"
      }`}
    >
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [tab, setTab] = useState<Tab>("profile");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Profile state
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  // Org state
  const [org, setOrg] = useState<OrgData | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSaving, setOrgSaving] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);

  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Seed profile from session
  useEffect(() => {
    if (session?.user) {
      setProfile({ name: session.user.name ?? "", email: session.user.email ?? "" });
    }
  }, [session]);

  // Fetch org when on billing/org tab
  useEffect(() => {
    if (tab === "organization" || tab === "billing") {
      fetch("/api/settings/org")
        .then((r) => r.json())
        .then((d: OrgData) => {
          setOrg(d);
          setOrgName(d.name);
        });
    }
  }, [tab]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to save.", "error"); return; }
      await updateSession({ name: data.name, email: data.email });
      showToast("Profile updated.", "success");
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) { showToast("New passwords do not match.", "error"); return; }
    if (pw.next.length < 8) { showToast("New password must be at least 8 characters.", "error"); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to update password.", "error"); return; }
      setPw({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully.", "success");
    } finally {
      setPwSaving(false);
    }
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    setOrgSaving(true);
    try {
      const res = await fetch("/api/settings/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to save.", "error"); return; }
      setOrg((o) => o ? { ...o, name: data.name } : o);
      showToast("Organization name updated.", "success");
    } finally {
      setOrgSaving(false);
    }
  }

  async function changePlan(tier: "STARTER" | "PRO" | "ENTERPRISE") {
    setPlanSaving(true);
    try {
      const res = await fetch("/api/admin/set-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to change plan.", "error"); return; }
      showToast(`Switched to ${data.name} plan.`, "success");
      // Refresh org data
      fetch("/api/settings/org").then((r) => r.json()).then((d: OrgData) => { setOrg(d); setOrgName(d.name); });
    } finally {
      setPlanSaving(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "organization", label: "Organization" },
    { id: "billing", label: "Plan & Billing" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-white mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-accent text-white" : "text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="space-y-6">
          {/* Profile info */}
          <div className="card">
            <h2 className="font-bold text-white mb-4">Personal Information</h2>
            <form onSubmit={saveProfile} className="space-y-4">
              <Field label="Full Name">
                <input
                  className="input"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Email Address">
                <input
                  type="email"
                  className="input"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={profileSaving} className="btn btn-primary disabled:opacity-50">
                  {profileSaving ? "Saving…" : "Save Changes"}
                </button>
                <div className="text-xs text-muted">
                  Role:{" "}
                  <span className="text-accent font-semibold">
                    {session?.user?.role?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="card">
            <h2 className="font-bold text-white mb-1">Change Password</h2>
            <p className="text-muted text-xs mb-4">Leave blank if you signed up via Google or Microsoft.</p>
            <form onSubmit={savePassword} className="space-y-4">
              <Field label="Current Password">
                <input
                  type="password"
                  className="input"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  autoComplete="current-password"
                />
              </Field>
              <Field label="New Password">
                <input
                  type="password"
                  className="input"
                  placeholder="Min 8 characters"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  className="input"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  autoComplete="new-password"
                />
              </Field>
              <button type="submit" disabled={pwSaving || !pw.current} className="btn btn-primary disabled:opacity-50">
                {pwSaving ? "Updating…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Organization tab */}
      {tab === "organization" && (
        <div className="card">
          <h2 className="font-bold text-white mb-4">Organization Details</h2>
          {!org ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : (
            <form onSubmit={saveOrg} className="space-y-4">
              <Field label="Organization Name">
                <input
                  className="input disabled:opacity-50"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isAdmin}
                  required
                />
                {!isAdmin && (
                  <p className="text-xs text-muted mt-1">Only admins can edit the organization name.</p>
                )}
              </Field>
              <Field label="Slug (read-only)">
                <input className="input opacity-50 cursor-not-allowed font-mono text-xs" value={org.slug} readOnly />
              </Field>
              <Field label="Team Size">
                <input className="input opacity-50 cursor-not-allowed" value={`${org._count.users} member${org._count.users !== 1 ? "s" : ""}`} readOnly />
              </Field>
              {isAdmin && (
                <button type="submit" disabled={orgSaving} className="btn btn-primary disabled:opacity-50">
                  {orgSaving ? "Saving…" : "Save Changes"}
                </button>
              )}
            </form>
          )}
        </div>
      )}

      {/* Plan & Billing tab */}
      {tab === "billing" && (
        <div className="space-y-6">
          {!org ? (
            <div className="card"><p className="text-muted text-sm">Loading…</p></div>
          ) : org.subscription ? (
            <>
              {/* Current plan card */}
              <div className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-white mb-1">Current Plan</h2>
                    <div className="flex items-center gap-2">
                      <span className="pill bg-accent/20 text-accent text-sm px-3 py-1">
                        {org.subscription.plan.name}
                      </span>
                      <StatusBadge status={org.subscription.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-white">
                      ${org.subscription.billingCycle === "YEARLY"
                        ? org.subscription.plan.yearlyPrice
                        : org.subscription.plan.monthlyPrice}
                    </div>
                    <div className="text-xs text-muted">
                      per month · billed {org.subscription.billingCycle.toLowerCase()}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-border">
                  {org.subscription.trialEndsAt && org.subscription.status === "TRIALING" && (
                    <div>
                      <div className="text-xs text-muted uppercase tracking-wide mb-1">Trial Ends</div>
                      <div className="text-sm font-semibold text-gold">
                        {new Date(org.subscription.trialEndsAt).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </div>
                    </div>
                  )}
                  {org.subscription.currentPeriodEnd && org.subscription.status !== "TRIALING" && (
                    <div>
                      <div className="text-xs text-muted uppercase tracking-wide mb-1">Next Renewal</div>
                      <div className="text-sm font-semibold text-white">
                        {new Date(org.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted uppercase tracking-wide mb-1">Billing Cycle</div>
                    <div className="text-sm font-semibold text-white capitalize">
                      {org.subscription.billingCycle.toLowerCase()}
                    </div>
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-3 gap-3 py-4 border-t border-border">
                  <LimitItem label="Users" value={org.subscription.plan.maxUsers} />
                  <LimitItem label="Events/mo" value={org.subscription.plan.maxEvents === 9999 ? "∞" : org.subscription.plan.maxEvents} />
                  <LimitItem label="Leads/mo" value={org.subscription.plan.maxLeads >= 999999 ? "∞" : org.subscription.plan.maxLeads.toLocaleString()} />
                </div>

                {isAdmin && (
                  <div className="pt-2 flex gap-3">
                    <Link href="/pricing" className="btn btn-primary text-sm">
                      Upgrade Plan
                    </Link>
                    {org.subscription.status === "ACTIVE" && (
                      <button className="btn btn-ghost text-sm text-danger hover:text-danger border-danger/30">
                        Cancel Subscription
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Plan switcher — admin only */}
              {isAdmin && (
                <div className="card">
                  <h2 className="font-bold text-white mb-1">Change Plan</h2>
                  <p className="text-muted text-xs mb-4">Switch your organization to a different plan immediately.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {PLANS.map((p) => {
                      const current = org.subscription?.plan.tier === p.tier;
                      return (
                        <div key={p.tier} className={`rounded-xl border p-4 flex flex-col gap-2 ${current ? p.color + " bg-accent/5" : "border-border"}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{p.name}</span>
                            {current && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">Current</span>}
                          </div>
                          <div className="text-xl font-extrabold text-white">${p.price}<span className="text-xs text-muted font-normal">/mo</span></div>
                          <div className="text-xs text-muted space-y-0.5">
                            <div>👥 {p.users}</div>
                            <div>📊 {p.leads}</div>
                            <div>🔗 {p.tier === "STARTER" ? "No CRM sync" : "CRM sync"}</div>
                          </div>
                          <button
                            onClick={() => changePlan(p.tier)}
                            disabled={current || planSaving}
                            className={`btn text-xs mt-auto disabled:opacity-40 ${current ? "btn-ghost" : "btn-primary"}`}
                          >
                            {current ? "Active" : planSaving ? "Switching…" : `Switch to ${p.name}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">💳</div>
              <h2 className="font-bold text-white mb-2">No active subscription</h2>
              <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
                Choose a plan to unlock all features.
              </p>
              <Link href="/pricing" className="btn btn-primary px-8">
                View Plans
              </Link>
            </div>
          )}
        </div>
      )}

      {toast && <Toast {...toast} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function LimitItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-lg font-extrabold text-white">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-green/20 text-green",
    TRIALING: "bg-gold/20 text-gold",
    PAST_DUE: "bg-danger/20 text-danger",
    CANCELED: "bg-muted/20 text-muted",
  };
  return (
    <span className={`pill ${map[status] ?? "bg-muted/20 text-muted"}`}>{status}</span>
  );
}
