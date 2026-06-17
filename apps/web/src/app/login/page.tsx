"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-[360px]">
        <div className="text-accent text-xl font-extrabold mb-1">⚡ EVENT IQ</div>
        <p className="text-muted text-sm mb-5">Sign in to your workspace</p>

        <button className="btn btn-ghost w-full mb-2" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
          Continue with Google
        </button>
        <button className="btn btn-ghost w-full mb-4" onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}>
          Continue with Microsoft
        </button>

        <div className="text-center text-xs text-muted mb-3">or</div>

        <input
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="btn btn-primary w-full"
          onClick={() => signIn("credentials", { email, password, callbackUrl: "/dashboard" })}
        >
          Sign in
        </button>

        <p className="text-center text-xs text-muted mt-4">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-accent hover:underline">
            Start free trial
          </a>
        </p>
      </div>
    </div>
  );
}
