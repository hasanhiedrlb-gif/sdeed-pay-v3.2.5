'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { SpP2PTransfer, KycStatus, SpUser } from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Send,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  UserCheck,
  KeyRound,
  Copy,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  TrendingUp,
  Activity,
  BarChart2,
  Calendar,
  DollarSign,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export default function TransferPage() {
  const { currentUser, users, refreshUsers } = useUser();
  const [activeTab, setActiveTab] = useState<'send' | 'qr' | 'history' | 'kyc'>('send');
  
  // Transfer Form State
  const [method, setMethod] = useState<'phone' | 'qr'>('phone');
  const [recipientInput, setRecipientInput] = useState('');
  const [amount, setAmount] = useState<number>(10);
  const [transferLoading, setTransferLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Confirmation Modal State
  const [pendingTransfer, setPendingTransfer] = useState<{
    transfer: SpP2PTransfer;
    otp_code: string;
    recipient_name: string;
    sender_phone: string;
  } | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Transfer History & Ledger State
  const [transfers, setTransfers] = useState<SpP2PTransfer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ledgerScope, setLedgerScope] = useState<'all' | 'my'>('all');
  const [chartMetric, setChartMetric] = useState<'volume' | 'in_out' | 'count'>('volume');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // User QR Payload State
  const [qrData, setQrData] = useState<{
    user_id: string;
    app: string;
    name: string;
    phone: string | null;
    kyc_status: string;
    qr_image_url: string;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // KYC Management
  const [updatingKyc, setUpdatingKyc] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadTransfers();
      loadQrData();
    }
  }, [currentUser]);

  async function loadTransfers() {
    setHistoryLoading(true);
    try {
      const data = await sdeedpayApi.getTransfers();
      setTransfers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  // 7-day Volume and Activity aggregation for Recharts LineChart
  const sevenDaysStats = useMemo(() => {
    const dataPoints: {
      dateKey: string;
      dayLabel: string;
      shortDay: string;
      fullDate: string;
      totalVolume: number;
      outboundVolume: number;
      inboundVolume: number;
      count: number;
      completedCount: number;
      avgAmount: number;
    }[] = [];

    const now = new Date();
    
    // Dataset for calculation based on selected scope
    const targetTransfers = ledgerScope === 'my' && currentUser
      ? transfers.filter((t) => t.from_user_id === currentUser.id || t.to_user_id === currentUser.id)
      : transfers;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const dayTransfers = targetTransfers.filter((t) => {
        const tDate = new Date(t.created_at);
        return tDate >= d && tDate < nextD;
      });

      const totalVolume = dayTransfers.reduce(
        (acc, t) => acc + (t.status === 'completed' || t.status === 'pending_otp' ? t.amount : 0),
        0
      );

      const outboundVolume = currentUser
        ? dayTransfers
            .filter((t) => t.from_user_id === currentUser.id)
            .reduce((acc, t) => acc + t.amount, 0)
        : 0;

      const inboundVolume = currentUser
        ? dayTransfers
            .filter((t) => t.to_user_id === currentUser.id)
            .reduce((acc, t) => acc + t.amount, 0)
        : 0;

      const count = dayTransfers.length;
      const completedCount = dayTransfers.filter((t) => t.status === 'completed').length;
      const avgAmount = count > 0 ? Number((totalVolume / count).toFixed(1)) : 0;

      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });

      dataPoints.push({
        dateKey: `${monthStr} ${dayNum}`,
        dayLabel: `${dayName} (${monthStr} ${dayNum})`,
        shortDay: dayName,
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        totalVolume,
        outboundVolume,
        inboundVolume,
        count,
        completedCount,
        avgAmount,
      });
    }

    const total7DayVolume = dataPoints.reduce((acc, r) => acc + r.totalVolume, 0);
    const total7DayCount = dataPoints.reduce((acc, r) => acc + r.count, 0);
    const peakVolume = Math.max(...dataPoints.map((r) => r.totalVolume), 0);
    const avg7DayTx = total7DayCount > 0 ? Number((total7DayVolume / total7DayCount).toFixed(2)) : 0;

    return {
      data: dataPoints,
      total7DayVolume,
      total7DayCount,
      peakVolume,
      avg7DayTx,
    };
  }, [transfers, currentUser, ledgerScope]);

  async function loadQrData() {
    if (!currentUser) return;
    setQrLoading(true);
    try {
      const data = await sdeedpayApi.getQrPayload(currentUser.id);
      setQrData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setQrLoading(false);
    }
  }

  async function handleInitiateTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // KYC Check
    if (currentUser.kyc_status !== 'verified') {
      setErrorMessage(
        'Identity verification required: Your Kamekaz account KYC is unverified. Please complete KYC verification first.',
      );
      return;
    }

    if (!recipientInput.trim()) {
      setErrorMessage(
        method === 'phone'
          ? 'Please enter the recipient phone number (e.g. +961 70 889900)'
          : 'Please enter or scan the recipient Kamekaz User ID (e.g. usr_kamekaz_worker_02)',
      );
      return;
    }

    if (amount <= 0) {
      setErrorMessage('Transfer amount must be at least $1.');
      return;
    }

    if (currentUser.points_balance < amount) {
      setErrorMessage(
        `Insufficient balance: Current balance is $${currentUser.points_balance.toFixed(2)}, required: $${amount}.`,
      );
      return;
    }

    setTransferLoading(true);
    try {
      const res = await sdeedpayApi.createTransfer({
        from_user_id: currentUser.id,
        to: recipientInput.trim(),
        amount: Number(amount),
        method,
      });

      setPendingTransfer(res);
      setOtpInput(res.otp_code); // Pre-fill for easy demonstration and simulation
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initiate transfer');
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingTransfer) return;

    setOtpError(null);
    setConfirmingOtp(true);

    try {
      const res = await sdeedpayApi.confirmTransfer({
        transfer_id: pendingTransfer.transfer.id,
        otp_code: otpInput.trim(),
      });

      setSuccessMessage(
        `Transfer of $${res.transfer.amount} to ${pendingTransfer.recipient_name} completed successfully!`,
      );
      setPendingTransfer(null);
      setOtpInput('');
      setRecipientInput('');
      await refreshUsers();
      await loadTransfers();
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid OTP code');
    } finally {
      setConfirmingOtp(false);
    }
  }

  async function handleToggleKyc(newStatus: 'verified' | 'unverified' | 'pending') {
    if (!currentUser) return;
    setUpdatingKyc(true);
    try {
      await sdeedpayApi.updateKycStatus(currentUser.id, newStatus);
      await refreshUsers();
      await loadQrData();
      setSuccessMessage(`Kamekaz KYC status updated to: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update KYC status');
    } finally {
      setUpdatingKyc(false);
    }
  }

  function handleCopyQrString() {
    if (!currentUser) return;
    const payload = JSON.stringify({ user_id: currentUser.id, app: 'sdeedpay' });
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              sdeedpay v1.2.0 • P2P & KYC
            </span>
            <span className="text-xs text-slate-400 font-mono">From: {currentUser?.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Send className="h-6 w-6 text-indigo-400" />
            P2P Instant Transfer & QR Code
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Instant peer-to-peer point transfers between Kamekaz ecosystem users with SMS OTP validation & KYC identity enforcement.
          </p>
        </div>

        {/* User Balance & KYC Badge */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-md text-right min-w-[170px]">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold block">
              Available Balance
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              ${currentUser?.points_balance.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-300">pts</span>
            </div>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              {currentUser?.kyc_status === 'verified' ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="h-3 w-3" /> Kamekaz KYC Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
                  <ShieldAlert className="h-3 w-3" /> KYC Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KYC Alert if Unverified */}
      {currentUser?.kyc_status !== 'verified' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Identity Verification Required (Kamekaz KYC)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                As per SdeedPay banking security regulations, your identity must be verified in Kamekaz before initiating P2P transfers or withdrawals.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleToggleKyc('verified')}
            disabled={updatingKyc}
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs whitespace-nowrap shadow-sm"
          >
            {updatingKyc ? 'Verifying...' : 'Verify KYC in Kamekaz'}
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('send')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'send'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Send className="h-4 w-4" />
          Send Money (P2P)
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'qr'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <QrCode className="h-4 w-4" />
          My QR Code
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="h-4 w-4" />
          Transfer Ledger ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab('kyc')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'kyc'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Kamekaz KYC Simulator
        </button>
      </div>

      {/* TAB 1: SEND MONEY (P2P) */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Transfer Form */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-indigo-600" />
                    Send Points to Peer
                  </span>
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    2-Step OTP Protected
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleInitiateTransfer} className="space-y-4">
                  {/* Method Selection: Phone vs QR */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Transfer Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMethod('phone')}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold transition ${
                          method === 'phone'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Smartphone className="h-4 w-4" />
                        Phone Number Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setMethod('qr')}
                        className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold transition ${
                          method === 'qr'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <QrCode className="h-4 w-4" />
                        QR Code / User ID
                      </button>
                    </div>
                  </div>

                  {/* Recipient Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        {method === 'phone' ? 'Recipient Phone Number' : 'Recipient Kamekaz User ID / QR'}
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {method === 'phone' ? 'e.g. +961 70 889900' : 'e.g. usr_kamekaz_worker_02'}
                      </span>
                    </div>
                    <Input
                      placeholder={method === 'phone' ? '+961 70 889900' : 'usr_kamekaz_worker_02'}
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      className="font-mono text-sm"
                      required
                    />
                  </div>

                  {/* Quick Select Preset Peers for Testing */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                      Quick Select Recipient (Kamekaz Directory):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {otherUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setRecipientInput(method === 'phone' ? u.phone : u.id);
                          }}
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition flex items-center gap-1.5"
                        >
                          <span className="font-bold">{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({method === 'phone' ? u.phone : u.id.replace('usr_kamekaz_', '')})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Transfer Amount (Points / USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">$</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                        className="pl-7 font-mono font-bold text-slate-900 text-base"
                        required
                      />
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      {[5, 10, 20, 50, 100].map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setAmount(amt)}
                          className={`rounded border px-2.5 py-1 text-xs font-bold transition ${
                            amount === amt
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Error & Success Messages */}
                  {errorMessage && (
                    <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={transferLoading || currentUser?.kyc_status !== 'verified'}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow-sm"
                  >
                    {transferLoading
                      ? 'Validating KYC & Preparing SMS OTP...'
                      : `Continue to OTP Verification ($${amount})`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Information & Rules Card */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  SdeedPay v1.2.0 Transfer Protocols
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs text-slate-600">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
                  <h5 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
                      1
                    </span>
                    Kamekaz KYC Identity Gate
                  </h5>
                  <p className="text-slate-600 leading-relaxed">
                    Calls <code className="text-indigo-600 font-mono">GET /user/:id/kyc-status</code>. Both sender and recipient must have active KYC status verified in Kamekaz before funds can be transferred.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
                  <h5 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
                      2
                    </span>
                    6-Digit SMS OTP Challenge
                  </h5>
                  <p className="text-slate-600 leading-relaxed">
                    A secure 6-digit confirmation code is generated and delivered to the sender's verified mobile phone to authorize the transaction.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80">
                  <h5 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
                      3
                    </span>
                    Dual Atomic Ledger Updates
                  </h5>
                  <p className="text-slate-600 leading-relaxed">
                    Simultaneously deducts sender balance and credits recipient balance, while writing double-entry audit records to the transactions database.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* OTP CONFIRMATION MODAL OVERLAY */}
      {pendingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Authorize P2P Transfer</h3>
                  <p className="text-xs text-slate-500">Enter 6-digit SMS verification code</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                ${pendingTransfer.transfer.amount} USD
              </Badge>
            </div>

            {/* Transfer Summary */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient:</span>
                <span className="font-bold text-slate-900">{pendingTransfer.recipient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-bold uppercase text-indigo-700">{pendingTransfer.transfer.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SMS Sent To:</span>
                <span className="font-mono text-slate-700">{pendingTransfer.sender_phone}</span>
              </div>
            </div>

            {/* Simulation Code Helper Box */}
            <div className="rounded-lg bg-indigo-50/80 p-3 border border-indigo-200 text-indigo-900 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> SMS Simulated Code:
                </span>
                <span className="font-mono font-black text-sm text-indigo-700 tracking-widest bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {pendingTransfer.otp_code}
                </span>
              </div>
              <p className="text-[11px] text-indigo-700/80">
                (Demo environment auto-generates OTP. Master code <code className="font-mono font-bold">000000</code> is also accepted.)
              </p>
            </div>

            <form onSubmit={handleConfirmOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  6-Digit OTP Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="e.g. 849201"
                  className="font-mono text-center text-xl font-bold tracking-widest text-slate-900"
                  required
                />
              </div>

              {otpError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingTransfer(null)}
                  className="w-1/2 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={confirmingOtp || otpInput.trim().length < 6}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {confirmingOtp ? 'Confirming...' : 'Confirm & Transfer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MY QR CODE */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 lg:col-span-5">
            <Card className="border-slate-200 shadow-sm text-center">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900">
                  My SdeedPay QR Code
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Peers can scan this QR code to transfer points directly to your account.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="mx-auto w-64 h-64 p-3 bg-white rounded-2xl border-2 border-indigo-100 shadow-inner flex items-center justify-center">
                  {qrLoading ? (
                    <div className="text-xs text-slate-400">Generating QR...</div>
                  ) : qrData ? (
                    <img
                      src={qrData.qr_image_url}
                      alt="SdeedPay QR Code"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <QrCode className="h-24 w-24 text-slate-300" />
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-left text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">User ID:</span>
                    <span className="font-bold text-slate-900">{currentUser?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">App Identifier:</span>
                    <span className="font-bold text-indigo-600">sdeedpay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">Holder Name:</span>
                    <span className="font-sans font-bold text-slate-800">{currentUser?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">Phone:</span>
                    <span className="font-bold text-slate-800">{currentUser?.phone}</span>
                  </div>
                </div>

                <Button
                  onClick={handleCopyQrString}
                  variant="outline"
                  className="w-full text-xs font-semibold flex items-center justify-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied QR Payload to Clipboard!' : 'Copy SdeedPay QR Payload String'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-6 lg:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">
                  QR Payload Specification (API: GET /api/v1/qr/:user_id)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs text-slate-600">
                <p>
                  Any mobile client scanning an official SdeedPay QR code receives the standardized JSON string payload below:
                </p>
                <div className="rounded-lg bg-slate-900 p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(
                    {
                      user_id: currentUser?.id,
                      app: 'sdeedpay',
                    },
                    null,
                    2,
                  )}
                </div>
                <p className="text-slate-500">
                  Scanning this code in the Kamekaz or Sdeed app triggers the P2P transfer route <code className="text-indigo-600 font-mono">POST /api/v1/transfer</code> with <code className="text-indigo-600 font-mono">method: 'qr'</code>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFER LEDGER & HISTORY WITH RECHARTS LINE CHART */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 7-DAY VOLUME RECHARTS VISUALIZATION CARD */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Recharts Analytics
                    </span>
                    <span className="text-[11px] text-slate-300">7-Day Trailing Window</span>
                  </div>
                  <CardTitle className="text-base font-bold text-white mt-1 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    P2P Transfer Volume & Daily Velocity
                  </CardTitle>
                  <p className="text-xs text-slate-300">
                    Real-time visualization of peer transfer values and volume flows over the last 7 days
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Scope Selector */}
                  <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setLedgerScope('all')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        ledgerScope === 'all'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      All Network
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerScope('my')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        ledgerScope === 'my'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      My Account
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadTransfers}
                    disabled={historyLoading}
                    className="text-xs flex items-center gap-1.5 bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </div>

              {/* 4 KPI METRIC STRIPS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/10">
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    7-Day Total Volume
                  </span>
                  <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                    ${sevenDaysStats.total7DayVolume.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-300">pts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" /> Settled peer transactions
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Transactions
                  </span>
                  <div className="text-xl font-black font-mono text-indigo-300 mt-0.5">
                    {sevenDaysStats.total7DayCount}{' '}
                    <span className="text-[10px] font-normal text-slate-300">transfers</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Activity className="h-3 w-3 text-indigo-400" /> Over trailing 7 days
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Single-Day Peak
                  </span>
                  <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
                    ${sevenDaysStats.peakVolume.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-300">pts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Highest daily volume recorded
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Average Transfer Size
                  </span>
                  <div className="text-xl font-black font-mono text-white mt-0.5">
                    ${sevenDaysStats.avg7DayTx.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-300">pts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Mean amount per transfer
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 pb-4">
              {/* Chart Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">Display Metric:</span>
                  <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setChartMetric('volume')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                        chartMetric === 'volume'
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Total Volume ($)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('in_out')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                        chartMetric === 'in_out'
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Flow (In vs Out)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMetric('count')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                        chartMetric === 'count'
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Transfer Count (#)
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {sevenDaysStats.data[0]?.fullDate} — {sevenDaysStats.data[6]?.fullDate}
                </div>
              </div>

              {/* RECHARTS CONTAINER */}
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sevenDaysStats.data}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="dateKey"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(value) => (chartMetric === 'count' ? `${value}` : `$${value}`)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-md min-w-[200px]">
                              <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                                <span>{item.dayLabel}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{item.shortDay}</span>
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-indigo-300 font-semibold">
                                  <span>Total Volume:</span>
                                  <span className="font-mono text-sm font-bold text-white">
                                    ${item.totalVolume.toFixed(2)}
                                  </span>
                                </div>
                                {chartMetric === 'in_out' && (
                                  <>
                                    <div className="flex items-center justify-between text-rose-300">
                                      <span>Outbound (Sent):</span>
                                      <span className="font-mono font-bold">-${item.outboundVolume.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-emerald-300">
                                      <span>Inbound (Received):</span>
                                      <span className="font-mono font-bold">+${item.inboundVolume.toFixed(2)}</span>
                                    </div>
                                  </>
                                )}
                                <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/80">
                                  <span>Transfers:</span>
                                  <span className="font-mono font-bold text-slate-200">{item.count} tx</span>
                                </div>
                                {item.count > 0 && (
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span>Avg Ticket:</span>
                                    <span className="font-mono text-slate-300">${item.avgAmount.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(value) => <span className="text-slate-700 font-semibold">{value}</span>}
                    />

                    {chartMetric === 'volume' && (
                      <Line
                        type="monotone"
                        dataKey="totalVolume"
                        name="Daily Volume ($)"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 1.5 }}
                        activeDot={{ r: 6, fill: '#4338ca', stroke: '#c7d2fe', strokeWidth: 2 }}
                      />
                    )}

                    {chartMetric === 'in_out' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="inboundVolume"
                          name="Inbound Received ($)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#059669', stroke: '#a7f3d0', strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="outboundVolume"
                          name="Outbound Sent ($)"
                          stroke="#f43f5e"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#e11d48', stroke: '#fecdd3', strokeWidth: 2 }}
                        />
                      </>
                    )}

                    {chartMetric === 'count' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Transfer Count (#)"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#d97706', stroke: '#fde68a', strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="completedCount"
                          name="Settled (#)"
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#10b981' }}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AUDIT TABLE & SEARCH LEDGER */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  P2P Transfer Ledger Records
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Comprehensive audit trail of settled and OTP-pending peer transactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search name, phone, ref..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading transfer history...</div>
              ) : transfers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No P2P transfers recorded in system.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Reference / ID</th>
                        <th className="p-3">Sender (From)</th>
                        <th className="p-3">Recipient (To)</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers
                        .filter((tx) => {
                          if (ledgerScope === 'my' && currentUser) {
                            if (tx.from_user_id !== currentUser.id && tx.to_user_id !== currentUser.id) {
                              return false;
                            }
                          }
                          if (!ledgerSearch.trim()) return true;
                          const q = ledgerSearch.toLowerCase();
                          return (
                            tx.reference_id?.toLowerCase().includes(q) ||
                            tx.id.toLowerCase().includes(q) ||
                            tx.from_user_name?.toLowerCase().includes(q) ||
                            tx.to_user_name?.toLowerCase().includes(q) ||
                            tx.to_phone?.toLowerCase().includes(q)
                          );
                        })
                        .map((tx) => {
                          const isOutbound = tx.from_user_id === currentUser?.id;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition">
                              <td className="p-3">
                                {isOutbound ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-rose-100 text-rose-800 font-bold px-2 py-0.5 text-[10px]">
                                    <ArrowUpRight className="h-3 w-3" /> OUTBOUND
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                                    <ArrowDownLeft className="h-3 w-3" /> INBOUND
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-semibold text-slate-800">
                                {tx.reference_id || tx.id}
                              </td>
                              <td className="p-3 text-slate-700">
                                <span className="font-bold">{tx.from_user_name || tx.from_user_id}</span>
                              </td>
                              <td className="p-3 text-slate-700">
                                <span className="font-bold">{tx.to_user_name || tx.to_user_id}</span>
                                {tx.to_phone && (
                                  <span className="block text-[10px] text-slate-400">{tx.to_phone}</span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-bold text-sm">
                                <span className={isOutbound ? 'text-rose-600' : 'text-emerald-600'}>
                                  {isOutbound ? `-$${tx.amount}` : `+$${tx.amount}`}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 uppercase font-bold text-[10px] border border-indigo-200">
                                  {tx.method}
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant={
                                    tx.status === 'completed'
                                      ? 'success'
                                      : tx.status === 'pending_otp'
                                      ? 'warning'
                                      : 'danger'
                                  }
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {tx.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-slate-500 text-[11px]">
                                {new Date(tx.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: KAMEKAZ KYC SIMULATOR */}
      {activeTab === 'kyc' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  Kamekaz Identity Verification (KYC) Gateway
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Simulate live KYC status responses from Kamekaz identity verification service
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block">Current Account KYC Status</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                      {currentUser?.name}
                      <span className="text-xs font-mono text-slate-400 font-normal">({currentUser?.id})</span>
                    </h4>
                  </div>
                  <div>
                    {currentUser?.kyc_status === 'verified' && (
                      <Badge variant="success" className="text-xs font-bold uppercase px-3 py-1">
                        Verified
                      </Badge>
                    )}
                    {currentUser?.kyc_status === 'unverified' && (
                      <Badge variant="danger" className="text-xs font-bold uppercase px-3 py-1">
                        Unverified
                      </Badge>
                    )}
                    {currentUser?.kyc_status === 'pending' && (
                      <Badge variant="warning" className="text-xs font-bold uppercase px-3 py-1">
                        Pending Review
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Switch / Test KYC Status State
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={currentUser?.kyc_status === 'verified' ? 'default' : 'outline'}
                      onClick={() => handleToggleKyc('verified')}
                      disabled={updatingKyc}
                      className={
                        currentUser?.kyc_status === 'verified'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs'
                          : 'text-xs text-slate-700'
                      }
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" /> Set Verified
                    </Button>
                    <Button
                      type="button"
                      variant={currentUser?.kyc_status === 'unverified' ? 'default' : 'outline'}
                      onClick={() => handleToggleKyc('unverified')}
                      disabled={updatingKyc}
                      className={
                        currentUser?.kyc_status === 'unverified'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs'
                          : 'text-xs text-slate-700'
                      }
                    >
                      <ShieldAlert className="h-4 w-4 mr-1" /> Set Unverified
                    </Button>
                    <Button
                      type="button"
                      variant={currentUser?.kyc_status === 'pending' ? 'default' : 'outline'}
                      onClick={() => handleToggleKyc('pending')}
                      disabled={updatingKyc}
                      className={
                        currentUser?.kyc_status === 'pending'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs'
                          : 'text-xs text-slate-700'
                      }
                    >
                      <Clock className="h-4 w-4 mr-1" /> Set Pending
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-5 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Directory Users & KYC Statuses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 text-xs">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{u.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                    </div>
                    <Badge
                      variant={
                        u.kyc_status === 'verified'
                          ? 'success'
                          : u.kyc_status === 'pending'
                          ? 'warning'
                          : 'danger'
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {u.kyc_status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
