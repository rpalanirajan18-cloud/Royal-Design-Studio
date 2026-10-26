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
  Zap,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fillAdminCredentials = () => {
    setEmail("royaldesignstudioofficial@gmail.com");
    setPassword("Admin@RDS2026");
    setError("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again or use the 1-Click button above.");
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
      {/* 1-Click Quick Fill Button for instantaneous login testing */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <div>
            <p className="text-xs font-bold text-white">Default Admin Login</p>
            <p className="text-[11px] text-slate-400">royaldesignstudioofficial@gmail.com</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fillAdminCredentials}
          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-500/30"
        >
          Auto-Fill
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2 animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="form-label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="royaldesignstudioofficial@gmail.com"
          className="form-input"
          required
          autoComplete="email"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary btn-lg w-full mt-3 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
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
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>End-to-end encrypted • Role-based access control</span>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#070b14] p-4 sm:p-6 lg:p-12">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/15 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-900/5 blur-[160px] pointer-events-none" />

      {/* Main Container: High-End Split Layout */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Side: Luxury Studio Showcase */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-8 pr-4">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold tracking-wide uppercase text-slate-300">
                Official Studio Management Suite
              </span>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="w-16 h-16 rounded-2xl bg-white/5 p-2.5 border border-white/10 flex items-center justify-center shadow-xl shadow-blue-500/10">
                <img
                  src="/logo-white.png"
                  alt="Royal Design Studio"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Royal Design Studio</span>
                </h1>
                <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase mt-0.5">
                  Ideas Into Impact
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Enterprise Billing, Studio Operations & Production Suite
                </p>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed max-w-lg pt-1">
              Complete production platform for high-impact branding, large-format printing,
              customized corporate gifting, and recurring digital marketing retainers.
            </p>
          </div>

          {/* Feature Grid Pills */}
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-2.5 text-blue-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="font-semibold text-xs text-white">Graphic & Brand Identity</span>
              </div>
              <p className="text-[11px] text-slate-400">Logo packs, packaging, marketing creatives</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-purple-500/30 transition-all">
              <div className="flex items-center gap-2.5 text-purple-400 mb-1">
                <Gift className="w-4 h-4" />
                <span className="font-semibold text-xs text-white">Customized Gifting</span>
              </div>
              <p className="text-[11px] text-slate-400">Trophies, laser engraving, photo plaques</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
                <Printer className="w-4 h-4" />
                <span className="font-semibold text-xs text-white">Printing Production</span>
              </div>
              <p className="text-[11px] text-slate-400">Flex banners, vinyl, visiting cards, offset</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2.5 text-amber-400 mb-1">
                <Layers className="w-4 h-4" />
                <span className="font-semibold text-xs text-white">Digital Retainers</span>
              </div>
              <p className="text-[11px] text-slate-400">Automated recurring billing & client retainers</p>
            </div>
          </div>

          {/* Location & Studio Details */}
          <div className="pt-2 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-400">
              📍 2/33-20, Sandhanakumarpatti, Avudayanoor, 627 808
            </p>
            <p>Phone & WhatsApp: +91 93859 31697 • royaldesignstudioofficial@gmail.com</p>
          </div>
        </div>

        {/* Right Side: Sleek Glass Login Card */}
        <div className="w-full lg:col-span-5 max-w-md mx-auto">
          <div className="glass-card p-7 sm:p-8 relative">
            {/* Mobile Header */}
            <div className="flex lg:hidden items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-12 h-12 rounded-xl bg-white/5 p-2 border border-white/10 flex items-center justify-center">
                <img src="/logo-white.png" alt="Royal Design Studio" className="w-9 h-9 object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Royal Design Studio</h2>
                <p className="text-xs text-slate-400">Business Management Suite</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Portal Sign In</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your administrative credentials to access studio records
              </p>
            </div>

            <Suspense fallback={<div className="py-12 text-center text-sm text-slate-400">Loading portal…</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-[11px] text-slate-500 mt-4">
            © {new Date().getFullYear()} Royal Design Studio. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
