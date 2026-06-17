"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter — $49/mo",
  PRO: "Pro — $149/mo",
  ENTERPRISE: "Enterprise — $399/mo",
};

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") ?? "PRO";
  const billing = params.get("billing") ?? "MONTHLY";

  const [form, setForm] = useState({
    orgName: "",
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: form.orgName,
          name: form.name,
          email: form.email,
          password: form.password,
          plan,
          billingCycle: billing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Signup failed. Please try again.");
        return;
      }
      // Auto sign-in after successful registration
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.ok) {
        router.push("/onboarding");
      } else {
        router.push("/login");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-accent text-xl font-extrabold">⚡ EVENT IQ</Link>
          <p className="text-muted text-sm mt-2">Start your 14-day free trial</p>
          {PLAN_LABELS[plan] && (
            <div className="inline-block bg-accent/10 border border-accent/30 text-accent text-xs font-semibold px-3 py-1 rounded-full mt-2">
              {PLAN_LABELS[plan]}
            </div>
          )}
        </div>

        <div className="card">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                Company Name
              </label>
              <input
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="Acme Corp"
                value={form.orgName}
                onChange={set("orgName")}
                required
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                Your Name
              </label>
              <input
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="Jane Smith"
                value={form.name}
                onChange={set("name")}
                required
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                Work Email
              </label>
              <input
                type="email"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="jane@acme.com"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                Password
              </label>
              <input
                type="password"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={set("password")}
                required
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                Confirm Password
              </label>
              <input
                type="password"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={set("confirm")}
                required
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create Account & Start Trial"}
            </button>

            <p className="text-xs text-muted text-center">
              By signing up you agree to our{" "}
              <a href="#" className="text-accent hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-accent hover:underline">Privacy Policy</a>.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
