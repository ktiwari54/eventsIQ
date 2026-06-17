"use client";

import { useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    tier: "STARTER",
    monthly: 49,
    yearly: 39,
    description: "Perfect for small teams running a handful of events per year.",
    highlight: false,
    features: [
      "Up to 5 events / month",
      "500 leads / month",
      "AI lead scoring",
      "Basic ROI reports",
      "CSV export",
      "Email support",
    ],
    limits: "5 users included",
    cta: "Start Free Trial",
  },
  {
    name: "Pro",
    tier: "PRO",
    monthly: 149,
    yearly: 119,
    description: "For growing teams that run events regularly and need CRM sync.",
    highlight: true,
    features: [
      "Unlimited events",
      "5,000 leads / month",
      "AI lead scoring + copilot",
      "Zoho CRM bidirectional sync",
      "Advanced ROI analytics",
      "PDF / Excel exports",
      "Budget approval workflow",
      "Priority support",
    ],
    limits: "15 users included",
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    tier: "ENTERPRISE",
    monthly: 399,
    yearly: 319,
    description: "Custom CRM, SSO, and dedicated support for large-scale event programs.",
    highlight: false,
    features: [
      "Everything in Pro",
      "Unlimited leads",
      "Custom CRM integrations",
      "SSO (Google + Microsoft)",
      "Dedicated account manager",
      "SLA guarantee (99.9%)",
      "Custom reporting",
      "Onboarding assistance",
    ],
    limits: "Unlimited users",
    cta: "Contact Sales",
  },
];

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.",
  },
  {
    q: "What happens after the 14-day trial?",
    a: "You'll be prompted to choose a plan. If you don't, your account moves to read-only mode — your data is never deleted.",
  },
  {
    q: "Do you support custom CRMs?",
    a: "Enterprise plans include custom CRM integration (Salesforce, HubSpot, etc.). Pro includes Zoho CRM out of the box.",
  },
  {
    q: "Is there a per-user fee?",
    a: "No. Each plan includes a seat allowance (5/15/unlimited). Additional seats are $10/user/month on Starter and Pro.",
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(true);

  return (
    <div className="min-h-screen bg-bg text-slate-100">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="text-accent text-xl font-extrabold">⚡ EVENT IQ</Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn btn-ghost text-sm">Sign in</Link>
          <Link href="/signup" className="btn btn-primary text-sm">Start Free Trial</Link>
        </div>
      </nav>

      {/* Header */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Simple, transparent pricing</h1>
        <p className="text-muted text-lg max-w-xl mx-auto mb-10">
          14-day free trial on every plan. No credit card required.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2">
          <button
            onClick={() => setYearly(false)}
            className={`text-sm font-semibold px-3 py-1 rounded-lg transition-colors ${!yearly ? "bg-accent text-white" : "text-muted hover:text-white"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`text-sm font-semibold px-3 py-1 rounded-lg transition-colors ${yearly ? "bg-accent text-white" : "text-muted hover:text-white"}`}
          >
            Yearly
            <span className="ml-2 bg-green/20 text-green text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* Plans */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card flex flex-col relative ${plan.highlight ? "border-accent ring-1 ring-accent/30" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <div className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">{plan.name}</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-white">
                    ${yearly ? plan.yearly : plan.monthly}
                  </span>
                  <span className="text-muted text-sm mb-1">/mo</span>
                </div>
                {yearly && (
                  <div className="text-xs text-muted">
                    Billed annually (${(yearly ? plan.yearly : plan.monthly) * 12}/yr)
                  </div>
                )}
                <p className="text-muted text-sm mt-3 leading-relaxed">{plan.description}</p>
                <div className="text-xs text-accent mt-2">{plan.limits}</div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-green mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {plan.cta === "Contact Sales" ? (
                <a
                  href="mailto:sales@eventiq.io"
                  className="btn btn-ghost w-full text-center"
                >
                  Contact Sales
                </a>
              ) : (
                <Link
                  href={`/signup?plan=${plan.tier}&billing=${yearly ? "YEARLY" : "MONTHLY"}`}
                  className={`btn w-full text-center ${plan.highlight ? "btn-primary" : "btn-ghost"}`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-extrabold mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="card">
              <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-muted text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <Link href="/" className="text-white font-bold mr-6">⚡ EVENT IQ</Link>
        © 2025 EventIQ. All rights reserved.
      </footer>
    </div>
  );
}
