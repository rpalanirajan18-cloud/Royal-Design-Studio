"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ShieldCheck,
  Printer,
  Gift,
  Layers,
  ArrowRight,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password. Please check your credentials and try again.");
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="username" className="form-label">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username (e.g. palanirajan)"
          className="form-input"
          required
          autoComplete="username"
          autoFocus
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="form-label mb-0">
            Password
          </label>
          <span className="text-[11px] text-slate-400">Case-sensitive</span>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="form-input pr-11 font-mono"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg w-full mt-3 shadow-md flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying Credentials…</span>
          </>
        ) : (
          <>
            <span>Sign In to Studio Portal</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>End-to-end encrypted • Role-based access control</span>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-[#070b14] p-4 sm:p-6 lg:p-12 transition-colors">
      {/* Main Container: Split Layout */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Side: Studio Showcase */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-6 pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-white/5 border border-blue-200 dark:border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-600 dark:text-slate-300">
                Official Studio Management Suite
              </span>
            </div>

            <div className="flex items-center gap-3.5 pt-1">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 p-1.5 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                <img
                  src="/logo.png"
                  alt="Royal Design Studio"
                  className="brand-logo-img brand-logo-light h-9 w-auto object-contain dark:hidden"
                />
                <img
                  src="/logo-white.png"
                  alt="Royal Design Studio"
                  className="brand-logo-img brand-logo-dark h-9 w-auto object-contain hidden dark:block"
                />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Royal Design Studio
                </h1>
                <p className="text-xs text-[#27348B] dark:text-cyan-400 font-bold tracking-widest uppercase">
                  Ideas Into Impact
                </p>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-lg">
              Enterprise Billing, Production Operations & Customer Suite for Branding,
              Large-Format Printing, Corporate Gifting & Retainers.
            </p>
          </div>

          {/* Feature Grid Pills */}
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] shadow-sm">
              <div className="flex items-center gap-2 text-[#27348B] dark:text-blue-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold text-xs text-slate-800 dark:text-white">Graphic & Branding</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Logo packs, packaging, creatives</p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] shadow-sm">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                <Gift className="w-4 h-4" />
                <span className="font-semibold text-xs text-slate-800 dark:text-white">Custom Gifting</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Trophies, laser engraving, plaques</p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                <Printer className="w-4 h-4" />
                <span className="font-semibold text-xs text-slate-800 dark:text-white">Printing Production</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Flex banners, vinyl, visiting cards</p>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                <Layers className="w-4 h-4" />
                <span className="font-semibold text-xs text-slate-800 dark:text-white">Digital Retainers</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Automated recurring billing cycles</p>
            </div>
          </div>

          {/* Location & Studio Details */}
          <div className="text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600 dark:text-slate-400">
              📍 2/33-20, Sandhanakumarpatti, Avudayanoor, 627 808
            </p>
            <p>Phone / WhatsApp: +91 93859 31697 • royaldesignstudioofficial@gmail.com</p>
          </div>
        </div>

        {/* Right Side: Clean Login Card */}
        <div className="w-full lg:col-span-5 max-w-md mx-auto">
          <div className="glass-card p-6 sm:p-7 relative bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-white/10 shadow-lg rounded-2xl">
            {/* Mobile Header */}
            <div className="flex lg:hidden items-center gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-white/5 p-1 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                <img src="/logo.png" alt="Royal Design Studio" className="brand-logo-img h-7 w-auto object-contain dark:hidden" />
                <img src="/logo-white.png" alt="Royal Design Studio" className="brand-logo-img h-7 w-auto object-contain hidden dark:block" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Royal Design Studio</h2>
                <p className="text-xs text-[#27348B] dark:text-cyan-400 font-bold uppercase">Ideas Into Impact</p>
              </div>
            </div>

            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Portal Sign In</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Enter your administrative credentials to access studio records
              </p>
            </div>

            <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Loading portal…</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-4">
            © {new Date().getFullYear()} Royal Design Studio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
