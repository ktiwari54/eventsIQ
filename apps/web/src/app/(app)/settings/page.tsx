"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Tab = "profile" | "organization" | "users" | "billing";

const PLANS = [
  { tier: "STARTER",    name: "Starter",    price: 49,  users: "5 users",      leads: "500 leads",    color: "border-border",       rank: 0 },
  { tier: "PRO",        name: "Pro",        price: 149, users: "15 users",     leads: "5,000 leads",  color: "border-accent",       rank: 1 },
  { tier: "ENTERPRISE", name: "Enterprise", price: 399, users: "Unlimited",    leads: "Unlimited",    color: "border-purple-500",   rank: 2 },
] as const;

const TIER_RANK: Record<string, number> = { STARTER: 0, PRO: 1, ENTERPRISE: 2 };

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  FINANCE_MANAGER: "Finance Manager",
  EVENT_MANAGER: "Event Manager",
  SALES_MANAGER: "Sales Manager",
  SALES_EXECUTIVE: "Sales Executive",
  VENDOR: "Vendor",
  MANAGEMENT: "Management",
};

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

type OrgUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
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

  // Users state
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "SALES_EXECUTIVE" as string, password: "" });
  const [addingUser, setAddingUser] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    if (session?.user) {
      setProfile({ name: session.user.name ?? "", email: session.user.email ?? "" });
    }
  }, [session]);

  useEffect(() => {
    if (tab === "organization" || tab === "billing") {
      fetch("/api/settings/org")
        .then((r) => r.json())
        .then((d: OrgData) => { setOrg(d); setOrgName(d.name); });
    }
    if (tab === "users") {
      loadUsers();
    }
  }, [tab]);

  function loadUsers() {
    setUsersLoading(true);
    fetch("/api/settings/users")
      .then((r) => r.json())
      .then((d: OrgUser[]) => setUsers(d))
      .finally(() => setUsersLoading(false));
  }

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
      fetch("/api/settings/org").then((r) => r.json()).then((d: OrgData) => { setOrg(d); setOrgName(d.name); });
    } finally {
      setPlanSaving(false);
    }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to add user.", "error"); return; }
      showToast(`${data.name} added successfully.`, "success");
      setNewUser({ name: "", email: "", role: "SALES_EXECUTIVE", password: "" });
      setShowAddUser(false);
      loadUsers();
    } finally {
      setAddingUser(false);
    }
  }

  async function removeUser(userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from your organization?`)) return;
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/settings/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? "Failed to remove user.", "error"); return; }
      showToast(`${userName} removed.`, "success");
      loadUsers();
    } finally {
      setRemovingUserId(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "organization", label: "Organization" },
    { id: "users", label: "Users" },
    { id: "billing", label: "Plan & Billing" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-white mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6 w-fit flex-wrap">
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
                    {ROLE_LABELS[session?.user?.role ?? ""] ?? session?.user?.role}
                  </span>
                </div>
              </div>
            </form>
          </div>

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

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">Team Members</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowAddUser((v) => !v)}
                  className="btn btn-primary text-sm"
                >
                  {showAddUser ? "Cancel" : "+ Add User"}
                </button>
              )}
            </div>

            {/* Add user form */}
            {showAddUser && isAdmin && (
              <form onSubmit={addUser} className="bg-bg/50 rounded-xl border border-border p-4 mb-4 space-y-3">
                <h3 className="text-sm font-bold text-white mb-2">New Team Member</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name">
                    <input
                      className="input"
                      value={newUser.name}
                      onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className="input"
                      value={newUser.email}
                      onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Role">
                    <select
                      className="input"
                      value={newUser.role}
                      onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                    >
                      <option value="SALES_EXECUTIVE">Sales Executive</option>
                      <option value="SALES_MANAGER">Sales Manager</option>
                      <option value="EVENT_MANAGER">Event Manager</option>
                      <option value="FINANCE_MANAGER">Finance Manager</option>
                      <option value="MANAGEMENT">Management</option>
                      <option value="VENDOR">Vendor</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </Field>
                  <Field label="Temporary Password">
                    <input
                      type="password"
                      className="input"
                      placeholder="Min 8 characters"
                      value={newUser.password}
                      onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                      required
                    />
                  </Field>
                </div>
                <button type="submit" disabled={addingUser} className="btn btn-primary text-sm disabled:opacity-50">
                  {addingUser ? "Adding…" : "Add User"}
                </button>
              </form>
            )}

            {/* User list */}
            {usersLoading ? (
              <p className="text-muted text-sm">Loading…</p>
            ) : users.length === 0 ? (
              <p className="text-muted text-sm">No users found.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        {u.name}
                        {u.id === session?.user?.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-bold">You</span>
                        )}
                      </div>
                      <div className="text-xs text-muted">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bg border border-border text-muted">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                      {isAdmin && u.id !== session?.user?.id && (
                        <button
                          onClick={() => removeUser(u.id, u.name)}
                          disabled={removingUserId === u.id}
                          className="text-xs text-danger hover:underline disabled:opacity-40"
                        >
                          {removingUserId === u.id ? "Removing…" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plan limit note */}
          {org?.subscription && (
            <div className="text-xs text-muted text-center">
              {org._count.users} / {org.subscription.plan.maxUsers >= 9999 ? "∞" : org.subscription.plan.maxUsers} users on {org.subscription.plan.name} plan ·{" "}
              <button onClick={() => setTab("billing")} className="text-accent hover:underline">
                Upgrade to add more
              </button>
            </div>
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

                <div className="grid grid-cols-3 gap-3 py-4 border-t border-border">
                  <LimitItem label="Users" value={org.subscription.plan.maxUsers >= 9999 ? "∞" : org.subscription.plan.maxUsers} />
                  <LimitItem label="Events" value={org.subscription.plan.maxEvents === 9999 ? "∞" : org.subscription.plan.maxEvents} />
                  <LimitItem label="Leads" value={org.subscription.plan.maxLeads >= 999999 ? "∞" : org.subscription.plan.maxLeads.toLocaleString()} />
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted mb-1 uppercase tracking-wide font-semibold">What&apos;s included</div>
                  <ul className="text-xs text-muted space-y-1 mt-2">
                    <li>✅ Lead capture &amp; AI scoring</li>
                    <li>✅ Event &amp; budget management</li>
                    <li>✅ ROI engine &amp; reports</li>
                    {org.subscription.plan.tier !== "STARTER" ? (
                      <li>✅ CRM sync (Zoho, Salesforce, Dynamics)</li>
                    ) : (
                      <li className="opacity-50">🔒 CRM sync — upgrade to Pro</li>
                    )}
                    {org.subscription.plan.tier === "ENTERPRISE" && (
                      <li>✅ Unlimited users &amp; priority support</li>
                    )}
                  </ul>
                </div>

                {isAdmin && (
                  <div className="pt-4 flex gap-3 border-t border-border mt-4">
                    <Link href="/pricing" className="btn btn-primary text-sm">
                      View Pricing
                    </Link>
                  </div>
                )}
              </div>

              {/* Plan switcher — admin only */}
              {isAdmin && (
                <div className="card">
                  <h2 className="font-bold text-white mb-1">Change Plan</h2>
                  <p className="text-muted text-xs mb-4">
                    Upgrades require contacting our team. Downgrades take effect immediately.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {PLANS.map((p) => {
                      const currentTier = org.subscription?.plan.tier ?? "STARTER";
                      const current = currentTier === p.tier;
                      const currentRank = TIER_RANK[currentTier] ?? 0;
                      const isUpgrade = p.rank > currentRank;
                      const isDowngrade = p.rank < currentRank;

                      let action: React.ReactNode;
                      if (current) {
                        action = (
                          <button disabled className="btn btn-ghost text-xs mt-auto opacity-40 cursor-not-allowed">
                            Current Plan
                          </button>
                        );
                      } else if (p.tier === "ENTERPRISE") {
                        action = (
                          <a
                            href="mailto:sales@eventsiq.com?subject=Enterprise Plan Enquiry"
                            className="btn text-xs mt-auto text-center"
                            style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}
                          >
                            Contact Sales
                          </a>
                        );
                      } else if (isUpgrade) {
                        action = (
                          <a
                            href="mailto:sales@eventsiq.com?subject=Upgrade to Pro Plan"
                            className="btn btn-primary text-xs mt-auto text-center"
                          >
                            Upgrade — Contact Us
                          </a>
                        );
                      } else if (isDowngrade) {
                        action = (
                          <button
                            onClick={() => {
                              if (confirm(`Downgrade to ${p.name}? You will lose access to features on your current plan.`)) {
                                changePlan(p.tier as "STARTER" | "PRO" | "ENTERPRISE");
                              }
                            }}
                            disabled={planSaving}
                            className="btn btn-ghost text-xs mt-auto border-danger/30 text-danger hover:text-danger disabled:opacity-40"
                          >
                            {planSaving ? "Switching…" : `Downgrade to ${p.name}`}
                          </button>
                        );
                      }

                      return (
                        <div key={p.tier} className={`rounded-xl border p-4 flex flex-col gap-2 ${current ? p.color + " bg-accent/5" : "border-border"}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{p.name}</span>
                            {current && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">Current</span>}
                            {isUpgrade && !current && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green/10 text-green">Upgrade</span>}
                          </div>
                          <div className="text-xl font-extrabold text-white">${p.price}<span className="text-xs text-muted font-normal">/mo</span></div>
                          <div className="text-xs text-muted space-y-0.5">
                            <div>👥 {p.users}</div>
                            <div>📊 {p.leads}</div>
                            <div>🔗 {p.tier === "STARTER" ? "No CRM sync" : "CRM sync"}</div>
                          </div>
                          {action}
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
