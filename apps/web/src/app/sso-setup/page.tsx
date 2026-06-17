"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SsoSetupPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [plan, setPlan] = useState<"STARTER" | "PRO" | "ENTERPRISE">("PRO");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/sso-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      // Force NextAuth to re-fetch the JWT so orgId + role are populated
      await update();
      router.push("/onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const providerName = session?.user?.email?.endsWith("@gmail.com") ? "Google" : "Microsoft";

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-accent text-xl font-extrabold mb-2">⚡ EVENT IQ</div>
          <h1 className="text-2xl font-extrabold text-white mb-2">One last step</h1>
          <p className="text-muted text-sm">
            You signed in with {providerName} as{" "}
            <span className="text-white font-medium">{session?.user?.email}</span>.
            <br />
            Tell us about your company to finish setting up your workspace.
          </p>
        </div>

        <div className="card">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-1 block">
                Company / Organization Name
              </label>
              <input
                className="input"
                placeholder="Acme Corp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-muted uppercase tracking-wide font-semibold mb-2 block">
                Choose a Plan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["STARTER", "PRO", "ENTERPRISE"] as const).map((p) => {
                  const labels = { STARTER: ["Starter", "$49/mo"], PRO: ["Pro", "$149/mo"], ENTERPRISE: ["Enterprise", "$399/mo"] };
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlan(p)}
                      className={`border rounded-lg p-3 text-left transition-colors ${
                        plan === p
                          ? "border-accent bg-accent/10 text-white"
                          : "border-border text-muted hover:border-accent/50"
                      }`}
                    >
                      <div className="text-xs font-bold">{labels[p][0]}</div>
                      <div className="text-[11px] mt-0.5">{labels[p][1]}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted mt-2">
                14-day free trial · no credit card required ·{" "}
                <a href="/pricing" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                  compare plans
                </a>
              </p>
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !orgName.trim()}
              className="btn btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? "Setting up…" : "Create Workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
