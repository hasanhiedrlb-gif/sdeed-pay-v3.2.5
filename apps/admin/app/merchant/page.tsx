'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  RefreshCw,
  Zap,
  Terminal,
  Activity,
  Layers,
  Search,
  KeyRound,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/user-context';
import { CountUp } from '@/components/CountUp';

interface WalletData {
  id: string;
  userId: string;
  tier: 'C0' | 'C1' | 'C2' | 'C3';
  balance: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface TransactionData {
  id: string;
  walletId: string;
  referenceId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  type: string;
  status: string;
  appSource: string;
  description?: string;
  createdAt: string;
}

interface KycData {
  user_id: string;
  tier: 'C0' | 'C1' | 'C2' | 'C3';
  tier_level: number;
  is_verified: boolean;
  can_pay: boolean;
  topup_limit: number | null;
  tier_label: string;
  kyc_status: string;
}

export default function MerchantGlassDashboard() {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'create' | 'verify' | 'topup' | 'tiers'>('create');
  const [loading, setLoading] = useState(true);

  // Merchant & Wallets state
  const [merchantId, setMerchantId] = useState<string>('usr_merchant_sdeed_beirut');
  const [merchantWallet, setMerchantWallet] = useState<WalletData | null>(null);
  const [allWallets, setAllWallets] = useState<WalletData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sandbox: Create Payment
  const [payerId, setPayerId] = useState<string>('adv_kamekaz_tech_01'); // Default C2
  const [payAmount, setPayAmount] = useState<number>(45);
  const [payOrderId, setPayOrderId] = useState<string>(`ORD-${Math.floor(10000 + Math.random() * 90000)}`);
  const [payDescription, setPayDescription] = useState<string>('Payment for order checkout');
  const [payLoading, setPayLoading] = useState(false);
  const [payResponse, setPayResponse] = useState<any>(null);

  // Sandbox: Verify Payment
  const [verifyRef, setVerifyRef] = useState<string>('PAY-ORD-98214-BEIRUT');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResponse, setVerifyResponse] = useState<any>(null);

  // Sandbox: Topup Wallet
  const [topupUserId, setTopupUserId] = useState<string>('usr_merchant_sdeed_beirut');
  const [topupAmount, setTopupAmount] = useState<number>(250);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupResponse, setTopupResponse] = useState<any>(null);

  // KYC Quick Tiers
  const [selectedUserForKyc, setSelectedUserForKyc] = useState<string>('usr_customer_96170123456');
  const [kycStatusData, setKycStatusData] = useState<KycData | null>(null);
  const [kycUpdating, setKycUpdating] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [merchantId]);

  useEffect(() => {
    fetchKycForUser(selectedUserForKyc);
  }, [selectedUserForKyc]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Fetch all wallets from DB
      const resWallets = await fetch('/api/wallets');
      if (resWallets.ok) {
        const walletsData = await resWallets.json();
        setAllWallets(walletsData);
        const currentM = walletsData.find((w: WalletData) => w.userId === merchantId);
        if (currentM) setMerchantWallet(currentM);
      }

      // Fetch transactions
      const resTx = await fetch('/api/transactions');
      if (resTx.ok) {
        const txData = await resTx.json();
        setTransactions(txData);
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchKycForUser(userId: string) {
    try {
      const res = await fetch(`/api/v1/kyc/status?user_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setKycStatusData(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleUpdateTier(userId: string, newTier: 'C0' | 'C1' | 'C2' | 'C3') {
    setKycUpdating(true);
    try {
      const res = await fetch('/api/v1/kyc/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, tier: newTier }),
      });
      if (res.ok) {
        await fetchKycForUser(userId);
        await fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKycUpdating(false);
    }
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    setPayLoading(true);
    setPayResponse(null);
    try {
      const res = await fetch('/api/pay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchantId,
          customer_user_id: payerId,
          amount: payAmount,
          order_id: payOrderId,
          description: payDescription,
        }),
      });
      const data = await res.json();
      setPayResponse({ status: res.status, ok: res.ok, data });
      if (res.ok) {
        // Refresh local data
        await fetchDashboardData();
        setPayOrderId(`ORD-${Math.floor(10000 + Math.random() * 90000)}`);
        if (data?.payment?.reference_id) {
          setVerifyRef(data.payment.reference_id);
        }
      }
    } catch (err: any) {
      setPayResponse({ status: 500, ok: false, data: { message: err?.message || 'Request failed' } });
    } finally {
      setPayLoading(false);
    }
  }

  async function handleVerifyPayment(e: React.FormEvent) {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyResponse(null);
    try {
      const res = await fetch('/api/pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_id: verifyRef }),
      });
      const data = await res.json();
      setVerifyResponse({ status: res.status, ok: res.ok, data });
    } catch (err: any) {
      setVerifyResponse({ status: 500, ok: false, data: { message: err?.message || 'Verification failed' } });
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault();
    setTopupLoading(true);
    setTopupResponse(null);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: topupUserId,
          amount: topupAmount,
          channel: 'merchant_portal',
          description: `Direct topup via Sadeed Pay Merchant Console`,
        }),
      });
      const data = await res.json();
      setTopupResponse({ status: res.status, ok: res.ok, data });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err: any) {
      setTopupResponse({ status: 500, ok: false, data: { message: err?.message || 'Topup failed' } });
    } finally {
      setTopupLoading(false);
    }
  }

  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const currentTier = merchantWallet?.tier || 'C3';

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Glassmorphic Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 via-indigo-950/90 to-slate-950 p-6 md:p-8 text-white shadow-2xl backdrop-blur-xl">
        {/* Glowing Background Orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Sadeed Pay API Engine
              </span>
              <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                Glass Dashboard v2.0
              </span>
              <span className="text-xs text-slate-400">Node.js + Prisma + PostgreSQL</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              لوحة تحكم سديد باي للتجار • Merchant Glass Panel
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              بوابة الدفع المباشرة مع التحقق الآلي من مستوى توثيق كانكاز (Kamekaz KYC Tier).
              تخزين الرصيد بجدول <code className="text-indigo-300 font-mono">wallets</code> مع حظر تخزين الهويات الشخصية.
            </p>
          </div>

          {/* Quick Merchant Selector */}
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md min-w-[240px]">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Active Merchant Account
            </label>
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="usr_merchant_sdeed_beirut">usr_merchant_sdeed_beirut (VIP C3)</option>
              <option value="adv_kamekaz_tech_01">adv_kamekaz_tech_01 (Tier C2)</option>
              <option value="usr_customer_96170123456">usr_customer_96170123456 (Tier C1)</option>
            </select>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Database Table:</span>
              <span className="font-mono text-emerald-400 font-bold">wallets.balance</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Glass Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Live Wallet Balance from DB */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl transition hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Merchant Wallet Balance (رصيد التاجر)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <CountUp
              value={parseFloat(merchantWallet?.balance || '0')}
              prefix="$"
              duration={1400}
              className="text-3xl font-black font-mono text-emerald-400 tracking-tight"
            />
            <span className="text-xs font-bold text-slate-400 uppercase">
              {merchantWallet?.currency || 'USD'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px]">
            <span className="text-slate-400">Wallet ID in DB:</span>
            <span className="font-mono text-indigo-300 font-semibold">{merchantWallet?.id || 'w-pending'}</span>
          </div>
        </div>

        {/* Card 2: Kamekaz KYC Tier & Rules */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl transition hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Kamekaz KYC Tier & Privilege
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                currentTier === 'C2' || currentTier === 'C3'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : currentTier === 'C1'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`rounded-lg px-2.5 py-1 text-sm font-black font-mono tracking-wider ${
                currentTier === 'C2' || currentTier === 'C3'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : currentTier === 'C1'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              TIER {currentTier}
            </span>
            <span className="text-xs font-bold text-white">
              {currentTier === 'C2' || currentTier === 'C3'
                ? 'شحن غير محدود ومؤهل للدفع'
                : currentTier === 'C1'
                ? 'سقف 500$ (غير مؤهل للدفع)'
                : 'غير موثق (محظور)'}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px]">
            <span className="text-slate-400">Payment Eligibility:</span>
            <span
              className={`font-semibold ${
                currentTier === 'C2' || currentTier === 'C3' ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currentTier === 'C2' || currentTier === 'C3' ? 'مؤهل لإنشاء الدفع (>= C2)' : 'حساب غير مؤهل (< C2)'}
            </span>
          </div>
        </div>

        {/* Card 3: Direct API Rules & Zero-Identity Mandate */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl transition hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              API Security & Privacy Rules
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 space-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>ممنوع تخزين هوية (No KYC stored)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>فحص مباشر: <code className="font-mono text-indigo-300">GET /api/v1/kyc/status</code></span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px]">
            <span className="text-slate-400">Total Transactions:</span>
            <span className="font-mono text-white font-bold">{transactions.length} logged in DB</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Glass Workspace (Tabs for API Testing & Simulator) */}
      <div className="rounded-3xl border border-white/15 bg-slate-900/80 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-slate-950/60 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'create'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>POST /pay/create (إنشاء دفع)</span>
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'verify'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>POST /pay/verify (التحقق والتسوية)</span>
            </button>

            <button
              onClick={() => setActiveTab('topup')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'topup'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>POST /wallet/topup (شحن المحفظة)</span>
            </button>

            <button
              onClick={() => setActiveTab('tiers')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'tiers'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Kamekaz Tier Simulator (محاكي التوثيق)</span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchDashboardData}
            className="border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 text-xs h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh DB
          </Button>
        </div>

        {/* Tab Content 1: POST /pay/create */}
        {activeTab === 'create' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  Create Payment Request (طلب دفع جديد)
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  يتم التحقق أولاً من <code className="text-indigo-300">GET /api/v1/kyc/status</code>. إذا كان مستوى الزبون أقل من C2 يتم الرفض بـ &quot;حسابك غير مؤهل للدفع&quot;.
                </p>

                <form onSubmit={handleCreatePayment} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Customer / Payer User ID
                    </label>
                    <select
                      value={payerId}
                      onChange={(e) => setPayerId(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="adv_kamekaz_tech_01">adv_kamekaz_tech_01 (Tier C2 - مؤهل للدفع ✅)</option>
                      <option value="usr_kamekaz_worker_01">usr_kamekaz_worker_01 (Tier C2 - مؤهل للدفع ✅)</option>
                      <option value="usr_customer_96170123456">usr_customer_96170123456 (Tier C1 - غير مؤهل ❌)</option>
                      <option value="usr_kamekaz_worker_04">usr_kamekaz_worker_04 (Tier C0 - غير موثق ❌)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      جرّب اختيار حساب C1 أو C0 لمعاينة رفض الطلب الفوري وحماية بوابة الدفع.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Payment Amount ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">$</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={payAmount}
                        onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                        className="pl-7 bg-slate-950 border-white/20 text-white font-mono font-bold text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Merchant Order ID / Reference
                    </label>
                    <Input
                      value={payOrderId}
                      onChange={(e) => setPayOrderId(e.target.value)}
                      className="bg-slate-950 border-white/20 text-white font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Description
                    </label>
                    <Input
                      value={payDescription}
                      onChange={(e) => setPayDescription(e.target.value)}
                      className="bg-slate-950 border-white/20 text-white text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={payLoading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs py-2.5 shadow-lg shadow-indigo-600/30"
                  >
                    {payLoading ? 'Checking KYC & Processing...' : 'Execute POST /pay/create'}
                  </Button>
                </form>
              </div>
            </div>

            {/* Live API Console Output */}
            <div className="lg:col-span-7 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-slate-300 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[11px] font-bold text-slate-400 ml-2">Live HTTP Inspector</span>
                  </div>
                  {payResponse && (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        payResponse.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      HTTP {payResponse.status}
                    </span>
                  )}
                </div>

                {!payResponse ? (
                  <div className="py-12 text-center text-slate-500">
                    <Terminal className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p>Click &quot;Execute POST /pay/create&quot; on the left to trigger live API</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-x-auto">
                    {payResponse.ok ? (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300 text-xs">
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Payment Processed Successfully (تم الدفع والتسوية)</span>
                        </div>
                        <p className="text-[11px] text-emerald-200/80">
                          KYC Tier C2 Verified. Deducted from payer wallet and credited to merchant wallet in DB.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300 text-xs">
                        <div className="flex items-center gap-2 font-bold mb-1">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            {payResponse.data?.error || payResponse.data?.message || 'Payment Rejected'}
                          </span>
                        </div>
                        <p className="text-[11px] text-rose-200/80">
                          {payResponse.data?.details || 'المستخدم غير مؤهل للدفع بسبب انخفاض مستوى التوثيق عن C2.'}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">RAW JSON RESPONSE:</span>
                      <pre className="p-3 rounded-lg bg-slate-900/90 text-emerald-400 text-[11px] leading-relaxed overflow-x-auto border border-white/5">
                        {JSON.stringify(payResponse.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: POST /pay/verify */}
        {activeTab === 'verify' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Verify Transaction & Settlement
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  فحص مرجع العملية من جدول <code className="text-indigo-300">transactions</code> والتحقق من التوثيق والتسوية.
                </p>

                <form onSubmit={handleVerifyPayment} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Payment Reference ID (مرجع الدفع)
                    </label>
                    <Input
                      value={verifyRef}
                      onChange={(e) => setVerifyRef(e.target.value)}
                      placeholder="e.g. PAY-ORD-98214-BEIRUT"
                      className="bg-slate-950 border-white/20 text-white font-mono text-xs"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={verifyLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 shadow-lg shadow-emerald-600/30"
                  >
                    {verifyLoading ? 'Verifying...' : 'Execute POST /pay/verify'}
                  </Button>
                </form>

                {/* Quick References to test */}
                <div className="mt-4 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Quick Select Sample References:
                  </span>
                  <div className="space-y-1.5">
                    {transactions.slice(0, 3).map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setVerifyRef(tx.referenceId)}
                        className="w-full text-left rounded-lg bg-white/5 p-2 text-[11px] font-mono text-slate-300 hover:bg-white/10 hover:text-white transition flex items-center justify-between"
                      >
                        <span>{tx.referenceId}</span>
                        <span className="text-emerald-400 font-bold">${parseFloat(tx.amount)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-slate-300 shadow-inner min-h-[300px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="text-[11px] font-bold text-slate-400">Verification Result Payload</span>
                  {verifyResponse && (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        verifyResponse.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {verifyResponse.data?.verified ? 'VERIFIED ✅' : 'NOT FOUND ❌'}
                    </span>
                  )}
                </div>

                {!verifyResponse ? (
                  <div className="py-12 text-center text-slate-500">
                    <ShieldCheck className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p>Enter reference ID and execute verification</p>
                  </div>
                ) : (
                  <pre className="p-3 rounded-lg bg-slate-900/90 text-emerald-400 text-[11px] leading-relaxed overflow-x-auto border border-white/5">
                    {JSON.stringify(verifyResponse.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: POST /wallet/topup */}
        {activeTab === 'topup' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-400" />
                  Topup Wallet (شحن المحفظة بقواعد التوثيق)
                </h3>
                <div className="text-xs text-slate-300 space-y-1 mb-4">
                  <p className="text-amber-300 font-semibold">قواعد شحن كانكاز:</p>
                  <p>• مستوى C1: سقف 500$ كحد أقصى للعملية الواحدة.</p>
                  <p>• مستوى C2 & C3: شحن غير محدود.</p>
                  <p>• مستوى C0: محظور من الشحن (غير موثق).</p>
                </div>

                <form onSubmit={handleTopup} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      User / Account to Topup
                    </label>
                    <select
                      value={topupUserId}
                      onChange={(e) => setTopupUserId(e.target.value)}
                      className="w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="usr_merchant_sdeed_beirut">usr_merchant_sdeed_beirut (Tier C3 - غير محدود)</option>
                      <option value="adv_kamekaz_tech_01">adv_kamekaz_tech_01 (Tier C2 - غير محدود)</option>
                      <option value="usr_customer_96170123456">usr_customer_96170123456 (Tier C1 - سقف 500$)</option>
                      <option value="usr_kamekaz_worker_04">usr_kamekaz_worker_04 (Tier C0 - محظور)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Topup Amount ($ USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">$</span>
                      <Input
                        type="number"
                        min="10"
                        step="10"
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(parseFloat(e.target.value) || 0)}
                        className="pl-7 bg-slate-950 border-white/20 text-white font-mono font-bold text-sm"
                        required
                      />
                    </div>
                    <div className="mt-1 flex gap-2">
                      {[50, 200, 500, 750, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                            amt > 500
                              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          ${amt} {amt > 500 ? '(C1 limit test)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={topupLoading}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 shadow-lg shadow-amber-600/30"
                  >
                    {topupLoading ? 'Validating Tier & Topping Up...' : 'Execute POST /wallet/topup'}
                  </Button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-slate-300 shadow-inner min-h-[300px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <span className="text-[11px] font-bold text-slate-400">Topup Response Inspector</span>
                  {topupResponse && (
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        topupResponse.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      HTTP {topupResponse.status}
                    </span>
                  )}
                </div>

                {!topupResponse ? (
                  <div className="py-12 text-center text-slate-500">
                    <Wallet className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p>Select account, choose amount, and execute topup</p>
                  </div>
                ) : (
                  <pre className="p-3 rounded-lg bg-slate-900/90 text-emerald-400 text-[11px] leading-relaxed overflow-x-auto border border-white/5">
                    {JSON.stringify(topupResponse.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 4: Tier Simulator */}
        {activeTab === 'tiers' && (
          <div className="p-6 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    Kamekaz KYC Live Tier Modifier & Query
                  </h3>
                  <p className="text-xs text-slate-400">
                    عدّل مستوى التوثيق لأي حساب لمعاينة استجابة البوابة فوراً عبر <code className="text-indigo-300">GET /api/v1/kyc/status</code>
                  </p>
                </div>

                <select
                  value={selectedUserForKyc}
                  onChange={(e) => setSelectedUserForKyc(e.target.value)}
                  className="rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                >
                  <option value="usr_customer_96170123456">usr_customer_96170123456</option>
                  <option value="adv_kamekaz_tech_01">adv_kamekaz_tech_01</option>
                  <option value="usr_merchant_sdeed_beirut">usr_merchant_sdeed_beirut</option>
                  <option value="usr_kamekaz_worker_04">usr_kamekaz_worker_04</option>
                </select>
              </div>

              {kycStatusData && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Current Tier</span>
                    <span className="text-lg font-bold font-mono text-indigo-300">{kycStatusData.tier}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Can Create Payments</span>
                    <span className={`text-sm font-bold ${kycStatusData.can_pay ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {kycStatusData.can_pay ? 'مؤهل (YES)' : 'غير مؤهل (NO)'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Topup Limit</span>
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {kycStatusData.topup_limit === null ? 'Unlimited (غير محدود)' : `$${kycStatusData.topup_limit} USD`}
                    </span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-3">
                    <span className="text-[10px] uppercase text-slate-400 font-bold block">Kamekaz Verification</span>
                    <span className="text-sm font-bold text-emerald-400">{kycStatusData.kyc_status}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons to Set Tier */}
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Change KYC Tier for <code className="font-mono text-indigo-300">{selectedUserForKyc}</code>:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button
                    type="button"
                    onClick={() => handleUpdateTier(selectedUserForKyc, 'C0')}
                    disabled={kycUpdating}
                    className="border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold"
                  >
                    Set C0 (Unverified / Blocked)
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleUpdateTier(selectedUserForKyc, 'C1')}
                    disabled={kycUpdating}
                    className="border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold"
                  >
                    Set C1 (Cap $500 / No Pay)
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleUpdateTier(selectedUserForKyc, 'C2')}
                    disabled={kycUpdating}
                    className="border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold"
                  >
                    Set C2 (Unlimited & Pay Enabled)
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleUpdateTier(selectedUserForKyc, 'C3')}
                    disabled={kycUpdating}
                    className="border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold"
                  >
                    Set C3 (Merchant VIP)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Database Ledger Section (wallets & transactions tables) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Wallets Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  Database Table: <code className="text-indigo-300 font-mono">wallets</code>
                </h3>
                <p className="text-[11px] text-slate-400">Stores user_id, tier, and balance</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-400/30">
                {allWallets.length} Wallets
              </Badge>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {allWallets.map((w) => (
                <div
                  key={w.id}
                  className={`rounded-xl border p-3 transition ${
                    w.userId === merchantId
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white font-mono">{w.userId}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {w.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black font-mono text-emerald-400">
                        <CountUp value={parseFloat(w.balance)} prefix="$" duration={1200} />{' '}
                        <span className="text-[10px] text-slate-400">{w.currency}</span>
                      </p>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase font-mono ${
                          w.tier === 'C2' || w.tier === 'C3'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : w.tier === 'C1'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        Tier {w.tier}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Transactions Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  Database Table: <code className="text-indigo-300 font-mono">transactions</code>
                </h3>
                <p className="text-[11px] text-slate-400">Every payment or topup generates a new audit record</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-indigo-400 border-indigo-400/30">
                {transactions.length} Records
              </Badge>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/20 transition text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${
                          tx.type === 'ORDER_PAYMENT'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : tx.type === 'TOPUP'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {tx.type}
                      </span>
                      <span className="font-mono text-slate-300 font-bold">{tx.referenceId}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-sm text-white">
                        ${parseFloat(tx.amount).toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
                    <span>
                      From: <strong className="text-slate-200">{tx.fromUserId}</strong> &rarr; To:{' '}
                      <strong className="text-slate-200">{tx.toUserId}</strong>
                    </span>
                    <span className="font-mono text-[10px]">
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {tx.description && (
                    <p className="mt-1 text-[11px] text-slate-400 italic">{tx.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
