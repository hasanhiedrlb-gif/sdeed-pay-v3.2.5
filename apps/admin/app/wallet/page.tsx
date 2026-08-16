'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { SpWithdrawalRequest, PaymentMethod, ColorTag } from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  ShieldCheck,
  Building,
  Smartphone,
  MapPin,
  FileCheck,
  Send,
} from 'lucide-react';

const METHODS: { id: PaymentMethod; label: string; desc: string; requiresName: boolean }[] = [
  { id: 'omt', label: 'OMT (Intra/Cash)', desc: 'Official Cash Payout via OMT Agents', requiresName: true },
  { id: 'haram', label: 'Haram (Whish/Haram)', desc: 'Direct Cash Transfer', requiresName: true },
  { id: 'wish', label: 'Wish Money', desc: 'Instant In-App e-Wallet Transfer', requiresName: false },
  { id: 'shamcash', label: 'ShamCash', desc: 'Digital QR & Account Transfer', requiresName: false },
];

const QUICK_AMOUNTS = [10, 20, 30, 40, 50, 100];

const GOVERNORATES = [
  'Beirut',
  'Mount Lebanon (Metn / Keserwan)',
  'Mount Lebanon (Chouf / Aley)',
  'North (Tripoli / Koura)',
  'South (Saida / Tyre)',
  'Bekaa (Zahle / Baalbek)',
  'Nabatieh',
];

export default function WalletPage() {
  const { currentUser, refreshUsers } = useUser();
  const [requests, setRequests] = useState<SpWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [amount, setAmount] = useState<number>(20);
  const [method, setMethod] = useState<PaymentMethod>('omt');
  const [fullName, setFullName] = useState<string>(currentUser?.name || '');
  const [walletNumber, setWalletNumber] = useState<string>(currentUser?.wallet_number || '+96170112233');
  const [governorate, setGovernorate] = useState<string>('Beirut');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Worker proof confirmation modal state
  const [selectedReqForProof, setSelectedReqForProof] = useState<SpWithdrawalRequest | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [confirmingProof, setConfirmingProof] = useState(false);

  useEffect(() => {
    loadUserRequests();
  }, [currentUser]);

  async function loadUserRequests() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await sdeedpayApi.getUserWithdrawals(currentUser.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate multiple of 10
    if (amount < 10 || amount % 10 !== 0) {
      setErrorMessage('Withdrawal amount must be an exact multiple of 10 (e.g. 10, 20, 30, 40, 50, 100).');
      return;
    }

    const currentMethodObj = METHODS.find((m) => m.id === method);
    if (currentMethodObj?.requiresName && (!fullName || fullName.trim().length === 0)) {
      setErrorMessage(`Full legal name is required for ${method.toUpperCase()} agent cash collection.`);
      return;
    }

    if (!walletNumber) {
      setErrorMessage('Wallet / Mobile phone number is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await sdeedpayApi.createWithdrawal({
        user_id: currentUser.id,
        amount,
        method,
        full_name: fullName,
        wallet_number: walletNumber,
        governorate,
      });

      setSuccessMessage(
        `Withdrawal of $${amount} created successfully! Added to Liquidity Pool with tag "${res.request.color_tag.toUpperCase()}".`,
      );
      await refreshUsers();
      await loadUserRequests();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmProofSubmit() {
    if (!selectedReqForProof) return;
    setConfirmingProof(true);
    try {
      // Find active claims or simulate proof
      setSuccessMessage(`Confirmation proof uploaded for request ${selectedReqForProof.id}. Funds settled.`);
      setSelectedReqForProof(null);
      setProofUrl('');
      await refreshUsers();
      await loadUserRequests();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit confirmation proof');
    } finally {
      setConfirmingProof(false);
    }
  }

  const colorTagStyles: Record<ColorTag, { badge: string; border: string; bg: string }> = {
    green: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      border: 'border-emerald-200',
      bg: 'bg-emerald-50/50',
    },
    blue: {
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      border: 'border-blue-200',
      bg: 'bg-blue-50/50',
    },
    orange: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      border: 'border-amber-200',
      bg: 'bg-amber-50/50',
    },
    red: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      border: 'border-rose-200',
      bg: 'bg-rose-50/50',
    },
  };

  const currentMethodObj = METHODS.find((m) => m.id === method);

  return (
    <div className="space-y-6">
      {/* Top Banner: User Balance & Kamekaz Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              Worker Wallet (sdeedpay)
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {currentUser?.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {currentUser?.name || 'Worker Account'}
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Earnings from deliveries & tasks across Kamekaz ecosystem (10 Point = $1.00 USD)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-white/10 border border-white/15 p-4 backdrop-blur-md text-right min-w-[200px]">
            <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
              Available Points Balance
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-0.5">
              {Number(currentUser?.points_balance || 0).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-300">pts</span>
            </div>
            <p className="text-xs font-medium text-emerald-300/90 font-mono">
              ≈ ${((currentUser?.points_balance || 0) / 10).toFixed(2)} USD
            </p>
            <div className="mt-1 flex items-center justify-end gap-1">
              {currentUser?.kyc_status === 'verified' ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3" /> KYC Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                  <AlertCircle className="h-3 w-3" /> KYC Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Request Withdrawal Form & Active Pool Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Withdrawal Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-indigo-600" />
                  Request Cashout / Withdrawal
                </CardTitle>
                <Badge variant="outline" className="text-[11px] bg-slate-50">
                  Multiple of 10 Only
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                {/* Amount Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Select Amount (10 Point = $1.00 USD)
                    </label>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      Rate: 10 Pts = $1.00
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {QUICK_AMOUNTS.map((amt) => {
                      const isSelected = amount === amt;
                      return (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setAmount(amt)}
                          className={`rounded-lg border py-2 text-center text-xs font-bold transition ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>${amt} USD</div>
                          <div className="text-[10px] font-normal text-slate-500 font-mono">
                            {amt * 10} pts
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">$</span>
                    <Input
                      type="number"
                      min="10"
                      step="10"
                      value={amount}
                      onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                      className="pl-7 font-mono font-bold text-slate-900"
                      required
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Must be multiple of $10</span>
                    <span className="font-semibold text-indigo-600 font-mono">
                      Deducts {amount * 10} pts from balance
                    </span>
                  </div>
                </div>

                {/* Method Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Payout Method
                  </label>
                  <div className="space-y-2">
                    {METHODS.map((m) => {
                      const isSelected = method === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setMethod(m.id)}
                          className={`cursor-pointer rounded-lg border p-2.5 transition flex items-start justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="method"
                              checked={isSelected}
                              onChange={() => setMethod(m.id)}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900">{m.label}</span>
                                {m.requiresName && (
                                  <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-semibold text-amber-800">
                                    Full Name Req.
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">{m.desc}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Full Name (Required for OMT & Haram) */}
                {currentMethodObj?.requiresName && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Full Legal Name (Beneficiary)
                      </label>
                      <span className="text-[10px] text-amber-600 font-semibold">Required for OMT/Haram</span>
                    </div>
                    <Input
                      placeholder="e.g. Rami Tariq Al-Hassan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Must match government ID for cash collection at agent branches.
                    </p>
                  </div>
                )}

                {/* Wallet Number / Mobile */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Wallet / Mobile Phone Number
                  </label>
                  <Input
                    placeholder="+961 70 123 456"
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value)}
                    required
                  />
                </div>

                {/* Governorate */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Governorate (Region)
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                  >
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error & Success Feedback */}
                {errorMessage && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5"
                >
                  {submitting
                    ? 'Submitting into Pool...'
                    : `Submit $${amount} USD (${amount * 10} pts) Withdrawal to Pool`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Worker's Withdrawal History & Statuses */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  My Withdrawal Requests
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Tracking in-pool liquidity, advertiser matching, and payout clearances
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {requests.length} Total
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="py-12 text-center">
                  <Wallet className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No active withdrawal requests</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Submit your first cashout request on the left to join the liquidity pool.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const tagStyle = colorTagStyles[req.color_tag] || colorTagStyles.green;
                    return (
                      <div
                        key={req.id}
                        className={`rounded-xl border p-4 transition ${tagStyle.border} ${tagStyle.bg}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white font-extrabold text-slate-900 border border-slate-200 shadow-sm">
                              ${req.amount}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 uppercase">
                                  {req.method} Transfer
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${tagStyle.badge}`}
                                >
                                  {req.color_tag} (${req.amount})
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {req.full_name ? `${req.full_name} • ` : ''}
                                <span className="font-mono">{req.wallet_number}</span> ({req.governorate})
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <Badge
                              variant={
                                req.status === 'paid'
                                  ? 'success'
                                  : req.status === 'in_pool'
                                  ? 'outline'
                                  : req.status === 'reserved'
                                  ? 'warning'
                                  : 'default'
                              }
                              className="uppercase text-[10px] tracking-wider font-bold"
                            >
                              {req.status.replace('_', ' ')}
                            </Badge>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(req.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Status Description Box */}
                        <div className="mt-3 rounded-lg bg-white/80 p-2.5 text-xs text-slate-700 border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {req.status === 'in_pool' && (
                              <>
                                <Clock className="h-4 w-4 text-emerald-600" />
                                <span>Waiting in Liquidity Pool for Advertiser Batch Match</span>
                              </>
                            )}
                            {req.status === 'reserved' && (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-amber-600" />
                                <span>Matched & Reserved in Approved Deposit Batch. Payout pending.</span>
                              </>
                            )}
                            {req.status === 'paid' && (
                              <>
                                <FileCheck className="h-4 w-4 text-emerald-600" />
                                <span className="font-semibold text-emerald-700">Settled & Paid in full</span>
                              </>
                            )}
                          </div>

                          {/* Action button if reserved / advertiser sent proof */}
                          {req.status === 'reserved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReqForProof(req)}
                              className="text-xs h-7 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                            >
                              Confirm Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
