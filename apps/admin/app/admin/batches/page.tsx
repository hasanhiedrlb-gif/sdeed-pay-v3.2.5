'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import {
  SpDepositBatch,
  CombinationItem,
  AlternativeCombination,
  PaymentMethod,
} from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  Check,
  X,
  Sparkles,
  Cpu,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Edit3,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-react';

export default function AdminBatchesPage() {
  const { currentUser, refreshUsers } = useUser();
  const [batches, setBatches] = useState<SpDepositBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'pending' | 'history'>('pending');

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAlternatives, setSelectedAlternatives] = useState<Record<string, string>>({});
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Reject modal
  const [rejectBatchId, setRejectBatchId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Insufficient pool liquidity or policy constraint');

  useEffect(() => {
    loadBatches();
    const interval = setInterval(loadBatches, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadBatches() {
    try {
      const data = await sdeedpayApi.getBatches();
      setBatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(batch: SpDepositBatch) {
    setProcessingId(batch.id);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      // Check if admin selected an alternative combo
      const chosenAltId = selectedAlternatives[batch.id];
      let customCombo: CombinationItem[] | undefined = undefined;

      if (chosenAltId && batch.alternatives) {
        const found = batch.alternatives.find((a) => a.id === chosenAltId);
        if (found) customCombo = found.combination;
      }

      const res = await sdeedpayApi.approveBatch(batch.id, customCombo);
      setSuccessNotice(`Batch ${batch.id} approved! ${res.claims_count} cards generated & locked.`);
      await loadBatches();
      await refreshUsers();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to approve batch');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(batchId: string) {
    setProcessingId(batchId);
    try {
      await sdeedpayApi.rejectBatch(batchId, rejectReason);
      setRejectBatchId(null);
      setSuccessNotice(`Batch ${batchId} rejected and requests returned to pool.`);
      await loadBatches();
      await refreshUsers();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to reject batch');
    } finally {
      setProcessingId(null);
    }
  }

  const pendingBatches = batches.filter((b) => b.status === 'pending_admin');
  const historyBatches = batches.filter((b) => b.status !== 'pending_admin');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30">
              Admin Supervisor Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">Bank Approval Queue</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Deposit Batches & AI Optimizer</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Evaluate AI suggestion combinations, preserve large liquidity bills, and authorize cards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-md text-right">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">
              Pending Approval Queue
            </span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {pendingBatches.length} <span className="text-xs text-slate-300">batches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Notices */}
      {successNotice && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-medium text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-red-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterTab('pending')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              filterTab === 'pending'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Pending Admin Approval</span>
            <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-950">
              {pendingBatches.length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('history')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              filterTab === 'history'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Batch History ({historyBatches.length})</span>
          </button>
        </div>

        <Button size="sm" variant="outline" onClick={loadBatches} className="h-8 text-xs">
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Main List */}
      {loading ? (
        <Card className="p-12 text-center text-slate-400">Loading batch requests...</Card>
      ) : filterTab === 'pending' ? (
        pendingBatches.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">All pending batches cleared!</p>
            <p className="text-xs text-slate-400 mt-1">
              New advertiser deposit requests will appear here with automated AI allocation plans.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingBatches.map((batch) => {
              const selectedAltId = selectedAlternatives[batch.id] || 'alt_smart';
              return (
                <Card
                  key={batch.id}
                  className="overflow-hidden border-2 border-indigo-200 bg-white shadow-md"
                >
                  {/* Batch Header */}
                  <div className="bg-slate-900 p-5 text-white flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[11px] font-bold text-indigo-300 border border-indigo-500/40">
                          {batch.method.toUpperCase()} DEPOSIT
                        </span>
                        <span className="font-mono text-xs text-slate-400">ID: {batch.id}</span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-1">
                        Advertiser Request: ${batch.requested_amount} USD
                      </h3>
                      <p className="text-xs text-slate-300 font-mono">
                        Advertiser: {batch.advertiser_id} • Created{' '}
                        {new Date(batch.created_at).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectBatchId(batch.id)}
                        disabled={processingId === batch.id}
                        className="border-red-400/40 text-red-300 bg-red-950/40 hover:bg-red-900/60 hover:text-white text-xs h-9"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject Batch
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(batch)}
                        disabled={processingId === batch.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-5 shadow"
                      >
                        {processingId === batch.id ? (
                          'Approving...'
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1.5" />
                            Approve Combination & Issue Cards
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-5">
                    {/* AI Suggestion Intelligence Box */}
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                          <Cpu className="h-5 w-5 text-indigo-600" />
                          <span>AI Combination Engine Suggestion</span>
                        </div>
                        <Badge className="bg-indigo-600 text-white text-[10px]">
                          Preservation Rules Active
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1 bg-white p-3 rounded-lg border border-indigo-100">
                        <span className="font-bold text-slate-900 block mb-1">
                          Optimization Reasoning:
                        </span>
                        {batch.ai_reasoning?.map((reason, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-indigo-600 font-bold">•</span>
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alternatives Selection (Smart vs Greedy vs Micro) */}
                    {batch.alternatives && batch.alternatives.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                            Select Formulation Strategy to Authorize
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Admin can pick alternative or approve AI default
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {batch.alternatives.map((alt) => {
                            const isSelected = selectedAltId === alt.id;
                            return (
                              <div
                                key={alt.id}
                                onClick={() =>
                                  setSelectedAlternatives({
                                    ...selectedAlternatives,
                                    [batch.id]: alt.id,
                                  })
                                }
                                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                                  isSelected
                                    ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-600'
                                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    {alt.title}
                                  </span>
                                  <input
                                    type="radio"
                                    name={`alt_${batch.id}`}
                                    checked={isSelected}
                                    onChange={() => {}}
                                    className="text-indigo-600"
                                  />
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex flex-wrap gap-1 my-1.5">
                                    {alt.combination.map((c, ci) => (
                                      <span
                                        key={ci}
                                        className="rounded bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-900 border border-slate-200"
                                      >
                                        {c.count}x ${c.amount}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-[11px] text-slate-500">{alt.reasoning}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        /* Batch History Table */
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {historyBatches.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No batch history recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500 text-[10px]">
                    <tr>
                      <th className="p-3">Batch ID</th>
                      <th className="p-3">Advertiser</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Combination</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyBatches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-700">{b.id}</td>
                        <td className="p-3 font-mono">{b.advertiser_id}</td>
                        <td className="p-3 font-bold font-mono text-slate-900">
                          ${b.requested_amount}
                        </td>
                        <td className="p-3 uppercase font-bold text-slate-600">{b.method}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {b.suggested_combination.map((c, i) => (
                              <span key={i} className="rounded bg-slate-100 px-1.5 py-0.2 font-mono">
                                {c.count}x${c.amount}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={b.status === 'approved' ? 'success' : 'danger'}
                            className="uppercase text-[10px]"
                          >
                            {b.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-400">
                          {new Date(b.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {b.status === 'approved' && (
                            <Link href={`/deposit/${b.id}`}>
                              <Button size="sm" variant="outline" className="h-7 text-[11px]">
                                <Eye className="h-3 w-3 mr-1" />
                                View Cards
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      {rejectBatchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-base">
              <X className="h-5 w-5" />
              Reject Deposit Batch
            </div>
            <p className="text-xs text-slate-600">
              Rejecting this batch will release all candidate withdrawal requests back into the open
              liquidity pool for other advertisers.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Reason for Rejection</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-red-500 focus:outline-none"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectBatchId(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReject(rejectBatchId)}
                className="text-xs"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
