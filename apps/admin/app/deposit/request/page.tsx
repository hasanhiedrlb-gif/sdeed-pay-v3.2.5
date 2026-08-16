'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { SpDepositBatch, PaymentMethod, CombinationItem, AlternativeCombination } from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowDownToLine,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Layers,
  ShieldAlert,
  CreditCard,
  Building2,
  RefreshCw,
  Cpu,
} from 'lucide-react';

const METHODS: { id: PaymentMethod; label: string; desc: string }[] = [
  { id: 'omt', label: 'OMT (Intra/Cash)', desc: 'Official Cash Payout via OMT Agents' },
  { id: 'haram', label: 'Haram (Whish/Haram)', desc: 'Direct Cash Transfer' },
  { id: 'wish', label: 'Wish Money', desc: 'Instant In-App e-Wallet Transfer' },
  { id: 'shamcash', label: 'ShamCash', desc: 'Digital QR & Account Transfer' },
];

const PRESET_AMOUNTS = [30, 40, 50, 70, 100, 150, 200];

export default function DepositRequestPage() {
  const router = useRouter();
  const { currentUser, refreshUsers } = useUser();

  const [amount, setAmount] = useState<number>(40);
  const [method, setMethod] = useState<PaymentMethod>('omt');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Latest created batch state
  const [activeBatchResult, setActiveBatchResult] = useState<{
    batch_id: string;
    suggestion: CombinationItem[];
    alternatives: AlternativeCombination[];
    ai_reasoning: string[];
    requested_amount: number;
    status: string;
  } | null>(null);

  // Advertiser's batches history
  const [batches, setBatches] = useState<SpDepositBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  useEffect(() => {
    loadBatches();
    const interval = setInterval(loadBatches, 4000); // Polling for admin approval
    return () => clearInterval(interval);
  }, [currentUser]);

  async function loadBatches() {
    if (!currentUser) return;
    try {
      const data = await sdeedpayApi.getBatches(undefined, currentUser.id);
      setBatches(data);

      // If active batch was approved in backend, update its status
      if (activeBatchResult) {
        const found = data.find((b) => b.id === activeBatchResult.batch_id);
        if (found && found.status !== activeBatchResult.status) {
          setActiveBatchResult({
            ...activeBatchResult,
            status: found.status,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBatches(false);
    }
  }

  async function handleDepositSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMessage(null);
    if (amount < 10 || amount % 10 !== 0) {
      setErrorMessage('Deposit amount must be at least $10 and a multiple of 10.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await sdeedpayApi.createDepositRequest({
        advertiser_id: currentUser.id,
        amount,
        method,
      });

      setActiveBatchResult({
        batch_id: res.batch_id,
        suggestion: res.suggestion,
        alternatives: res.alternatives,
        ai_reasoning: res.ai_reasoning,
        requested_amount: res.requested_amount,
        status: res.status,
      });

      await loadBatches();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit deposit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              Advertiser Account
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {currentUser?.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Deposit & Fund Points</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            P2P liquidity matching with worker cashouts. 1 Point = $1.00 USD.
          </p>
        </div>

        <div className="rounded-xl bg-white/10 border border-white/15 p-4 backdrop-blur-md text-right min-w-[200px]">
          <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
            Advertiser Balance
          </span>
          <div className="text-3xl font-extrabold text-indigo-300 font-mono mt-0.5">
            ${currentUser?.points_balance.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-300">pts</span>
          </div>
          <span className="text-[11px] text-slate-400">Available Campaign Credits</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-indigo-600" />
                New Deposit Request
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Deposit Amount (USD)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {PRESET_AMOUNTS.map((amt) => {
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
                          ${amt}
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
                  <p className="mt-1 text-[11px] text-slate-500">
                    Must be in increments of $10 (10, 20, 30, 40, 50, 70, 100...)
                  </p>
                </div>

                {/* Method */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Preferred Deposit Method
                  </label>
                  <div className="space-y-2">
                    {METHODS.map((m) => {
                      const isSelected = method === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setMethod(m.id)}
                          className={`cursor-pointer rounded-lg border p-2.5 transition flex items-center justify-between ${
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
                              <span className="text-xs font-bold text-slate-900">{m.label}</span>
                              <p className="text-[11px] text-slate-500">{m.desc}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5"
                >
                  {submitting ? 'Running AI Optimizer...' : `Submit Request for $${amount} USD`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Suggestion & Active Waiting Status */}
        <div className="lg:col-span-7 space-y-4">
          {activeBatchResult ? (
            <Card className="border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white shadow-md">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        AI Combination Engine Allocation
                      </CardTitle>
                      <p className="font-mono text-xs text-slate-500">
                        Batch: {activeBatchResult.batch_id}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={activeBatchResult.status === 'approved' ? 'success' : 'warning'}
                    className="uppercase text-[11px] tracking-wider font-bold"
                  >
                    {activeBatchResult.status === 'pending_admin'
                      ? 'Waiting for Admin Approval'
                      : activeBatchResult.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* AI Reasoning Box */}
                <div className="rounded-xl border border-indigo-200 bg-white p-3.5 shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Cpu className="h-4 w-4 text-indigo-600" />
                    <span>Smart Liquidity Preservation Rules Applied</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                    {activeBatchResult.ai_reasoning.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                {/* Suggested Combination Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Optimal Transfer Combination (${activeBatchResult.requested_amount} Total)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activeBatchResult.suggestion.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm"
                      >
                        <span className="text-[11px] font-semibold text-slate-500">Denomination</span>
                        <div className="text-xl font-extrabold text-slate-900 my-0.5">
                          ${item.amount}
                        </div>
                        <span className="inline-block rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                          {item.count} Transfer{item.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Notice & Action */}
                {activeBatchResult.status === 'pending_admin' ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Clock className="h-4 w-4 animate-spin text-amber-600" />
                      <span>Waiting for Bank Admin Approval</span>
                    </div>
                    <p className="leading-relaxed">
                      Your deposit request has been computed by the Smart AI Engine and forwarded to
                      the SdeedPay Bank Supervisor queue. Once approved, you will receive individual
                      payout cards with beneficiary numbers to transfer funds.
                    </p>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-amber-700">Auto-refreshing status...</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={loadBatches}
                        className="text-xs h-7 border-amber-300 text-amber-900 bg-white hover:bg-amber-100"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Check Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-emerald-900">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <span>Approved by Bank Admin! Cards are ready for payment.</span>
                    </div>
                    <p className="leading-relaxed">
                      The withdrawal liquidity has been reserved. Click below to view the recipient
                      payment cards, QR codes, and upload your transfer receipts.
                    </p>
                    <Link href={`/deposit/${activeBatchResult.batch_id}`}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5">
                        Open Payment Cards (${activeBatchResult.requested_amount}) &rarr;
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">
                  Deposit Batches History
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadBatches}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingBatches ? (
                  <p className="text-center py-6 text-xs text-slate-400">Loading batches...</p>
                ) : batches.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No deposit batches yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose an amount on the left to start your first deposit.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batches.map((batch) => (
                      <div
                        key={batch.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                ${batch.requested_amount} USD
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                                {batch.method}
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-slate-400">{batch.id}</p>
                          </div>
                          <Badge
                            variant={
                              batch.status === 'approved'
                                ? 'success'
                                : batch.status === 'rejected'
                                ? 'danger'
                                : 'warning'
                            }
                            className="uppercase text-[10px] font-bold"
                          >
                            {batch.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        {/* Breakdown pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {batch.suggested_combination.map((item, i) => (
                            <span
                              key={i}
                              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 font-medium"
                            >
                              {item.count}x ${item.amount}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                          <span className="text-slate-400">
                            {new Date(batch.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {batch.status === 'approved' ? (
                            <Link href={`/deposit/${batch.id}`}>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                              >
                                View Cards &rarr;
                              </Button>
                            </Link>
                          ) : (
                            <button
                              onClick={() => {
                                setActiveBatchResult({
                                  batch_id: batch.id,
                                  suggestion: batch.suggested_combination,
                                  alternatives: batch.alternatives || [],
                                  ai_reasoning: batch.ai_reasoning || [],
                                  requested_amount: batch.requested_amount,
                                  status: batch.status,
                                });
                              }}
                              className="text-indigo-600 font-medium hover:underline text-xs"
                            >
                              View Status Details
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
