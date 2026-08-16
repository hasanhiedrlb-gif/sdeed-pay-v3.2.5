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
  formatPointsWithUsd,
} from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckSquare,
  Square,
  MinusSquare,
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
  Loader2,
  CheckCheck,
  Trash2,
  ListChecks,
} from 'lucide-react';

export default function AdminBatchesPage() {
  const { currentUser, refreshUsers } = useUser();
  const [batches, setBatches] = useState<SpDepositBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'pending' | 'history'>('pending');

  // Multi-selection states
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; action: string } | null>(null);
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('Bulk rejected by Admin Supervisor: liquidity reallocation');

  // Single Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedAlternatives, setSelectedAlternatives] = useState<Record<string, string>>({});
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Reject modal (single)
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

  const pendingBatches = batches.filter((b) => b.status === 'pending_admin');
  const historyBatches = batches.filter((b) => b.status !== 'pending_admin');

  // Selection helpers
  const selectedPendingBatches = pendingBatches.filter((b) => selectedBatchIds.includes(b.id));
  const isAllPendingSelected =
    pendingBatches.length > 0 && selectedPendingBatches.length === pendingBatches.length;
  const isSomePendingSelected =
    selectedPendingBatches.length > 0 && selectedPendingBatches.length < pendingBatches.length;

  const totalSelectedUsd = selectedPendingBatches.reduce((acc, b) => acc + b.requested_amount, 0);
  const totalSelectedPoints = totalSelectedUsd * 10;

  function toggleSelectBatch(batchId: string) {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  }

  function toggleSelectAllPending() {
    if (isAllPendingSelected) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(pendingBatches.map((b) => b.id));
    }
  }

  function clearSelection() {
    setSelectedBatchIds([]);
  }

  // Single Approve
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
      setSelectedBatchIds((prev) => prev.filter((id) => id !== batch.id));
      await loadBatches();
      await refreshUsers();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to approve batch');
    } finally {
      setProcessingId(null);
    }
  }

  // Single Reject
  async function handleReject(batchId: string) {
    setProcessingId(batchId);
    try {
      await sdeedpayApi.rejectBatch(batchId, rejectReason);
      setRejectBatchId(null);
      setSuccessNotice(`Batch ${batchId} rejected and requests returned to pool.`);
      setSelectedBatchIds((prev) => prev.filter((id) => id !== batchId));
      await loadBatches();
      await refreshUsers();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to reject batch');
    } finally {
      setProcessingId(null);
    }
  }

  // Bulk Approve Handler
  async function handleBulkApprove() {
    if (selectedPendingBatches.length === 0) return;
    setIsBulkProcessing(true);
    setErrorNotice(null);
    setSuccessNotice(null);
    setShowBulkApproveModal(false);

    let successCount = 0;
    let failedCount = 0;
    let totalClaimsCount = 0;
    const errors: string[] = [];

    setBulkProgress({
      current: 0,
      total: selectedPendingBatches.length,
      action: 'Approving combinations and issuing cards...',
    });

    for (let i = 0; i < selectedPendingBatches.length; i++) {
      const batch = selectedPendingBatches[i];
      setBulkProgress({
        current: i + 1,
        total: selectedPendingBatches.length,
        action: `Approving batch ${batch.id} ($${batch.requested_amount} USD)...`,
      });

      try {
        const chosenAltId = selectedAlternatives[batch.id];
        let customCombo: CombinationItem[] | undefined = undefined;
        if (chosenAltId && batch.alternatives) {
          const found = batch.alternatives.find((a) => a.id === chosenAltId);
          if (found) customCombo = found.combination;
        }

        const res = await sdeedpayApi.approveBatch(batch.id, customCombo);
        successCount++;
        totalClaimsCount += res.claims_count || 0;
      } catch (err: any) {
        failedCount++;
        errors.push(`${batch.id}: ${err?.message || 'Approval failed'}`);
      }
    }

    setIsBulkProcessing(false);
    setBulkProgress(null);
    setSelectedBatchIds([]);

    if (successCount > 0) {
      setSuccessNotice(
        `Bulk Approval Complete: Successfully approved ${successCount} batch(es), generated ${totalClaimsCount} total settlement cards!`
      );
    }
    if (failedCount > 0) {
      setErrorNotice(`Failed to approve ${failedCount} batch(es): ${errors.join(', ')}`);
    }

    await loadBatches();
    await refreshUsers();
  }

  // Bulk Reject Handler
  async function handleBulkReject() {
    if (selectedPendingBatches.length === 0) return;
    setIsBulkProcessing(true);
    setErrorNotice(null);
    setSuccessNotice(null);
    setShowBulkRejectModal(false);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    setBulkProgress({
      current: 0,
      total: selectedPendingBatches.length,
      action: 'Rejecting batches and releasing liquidity back to pool...',
    });

    for (let i = 0; i < selectedPendingBatches.length; i++) {
      const batch = selectedPendingBatches[i];
      setBulkProgress({
        current: i + 1,
        total: selectedPendingBatches.length,
        action: `Rejecting batch ${batch.id}...`,
      });

      try {
        await sdeedpayApi.rejectBatch(batch.id, bulkRejectReason);
        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`${batch.id}: ${err?.message || 'Reject failed'}`);
      }
    }

    setIsBulkProcessing(false);
    setBulkProgress(null);
    setSelectedBatchIds([]);

    if (successCount > 0) {
      setSuccessNotice(
        `Bulk Rejection Complete: Rejected ${successCount} batch(es). All reserved withdrawal requests have been returned to the liquidity pool.`
      );
    }
    if (failedCount > 0) {
      setErrorNotice(`Failed to reject ${failedCount} batch(es): ${errors.join(', ')}`);
    }

    await loadBatches();
    await refreshUsers();
  }

  return (
    <div className="space-y-6 pb-20">
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
            Evaluate AI suggestion combinations, preserve large liquidity bills, and authorize cards in bulk or individually
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
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-medium text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-600 hover:underline shrink-0 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-medium text-red-800 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-red-600 hover:underline shrink-0 ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk Processing Progress Banner */}
      {bulkProgress && (
        <div className="rounded-xl bg-indigo-900 border border-indigo-700 p-4 text-white shadow-lg space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
              <span>Bulk Action In Progress: {bulkProgress.action}</span>
            </div>
            <span className="font-mono text-indigo-300 font-bold">
              {bulkProgress.current} / {bulkProgress.total} completed
            </span>
          </div>
          <div className="w-full bg-indigo-950 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-400 to-emerald-400 h-2 transition-all duration-300 rounded-full"
              style={{
                width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%`,
              }}
            />
          </div>
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

        <div className="flex items-center gap-2">
          {filterTab === 'pending' && pendingBatches.length > 0 && (
            <Button
              size="sm"
              variant={isAllPendingSelected ? 'default' : 'outline'}
              onClick={toggleSelectAllPending}
              className="h-8 text-xs font-semibold"
            >
              {isAllPendingSelected ? (
                <>
                  <CheckSquare className="h-3.5 w-3.5 mr-1.5 text-emerald-300" />
                  Deselect All ({pendingBatches.length})
                </>
              ) : isSomePendingSelected ? (
                <>
                  <MinusSquare className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                  Select All ({pendingBatches.length})
                </>
              ) : (
                <>
                  <Square className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  Select All ({pendingBatches.length})
                </>
              )}
            </Button>
          )}

          <Button size="sm" variant="outline" onClick={loadBatches} className="h-8 text-xs">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
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
          <div className="space-y-4">
            {/* Multi-Select Status Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-200/80 px-4 py-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                  <input
                    type="checkbox"
                    checked={isAllPendingSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomePendingSelected;
                    }}
                    onChange={toggleSelectAllPending}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>
                    {selectedPendingBatches.length > 0 ? (
                      <span className="text-indigo-900 font-black">
                        {selectedPendingBatches.length} of {pendingBatches.length} batches selected
                      </span>
                    ) : (
                      <span className="text-slate-600">Select batches for bulk actions</span>
                    )}
                  </span>
                </label>

                {selectedPendingBatches.length > 0 && (
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 border border-indigo-200">
                    Total: ${totalSelectedUsd.toLocaleString()} USD ({totalSelectedPoints.toLocaleString()} pts)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedPendingBatches.length > 0 && (
                  <>
                    <button
                      onClick={clearSelection}
                      className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline"
                    >
                      Clear Selection
                    </button>
                    <span className="text-slate-300">|</span>
                    <Button
                      size="sm"
                      onClick={() => setShowBulkApproveModal(true)}
                      disabled={isBulkProcessing}
                      className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Bulk Approve ({selectedPendingBatches.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowBulkRejectModal(true)}
                      disabled={isBulkProcessing}
                      className="h-7 border-red-300 text-red-600 hover:bg-red-50 text-xs px-3"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Bulk Reject ({selectedPendingBatches.length})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Batch Cards */}
            <div className="space-y-5">
              {pendingBatches.map((batch) => {
                const selectedAltId = selectedAlternatives[batch.id] || 'alt_smart';
                const isSelected = selectedBatchIds.includes(batch.id);

                return (
                  <Card
                    key={batch.id}
                    className={`overflow-hidden border-2 bg-white shadow-md transition-all duration-200 ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/40 shadow-indigo-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Batch Header */}
                    <div
                      className={`p-5 text-white flex flex-wrap items-center justify-between gap-4 transition-colors ${
                        isSelected
                          ? 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900'
                          : 'bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Card Checkbox */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectBatch(batch.id)}
                            className="h-5 w-5 rounded border-slate-400 text-indigo-600 focus:ring-indigo-400 cursor-pointer accent-indigo-500"
                            id={`check_batch_${batch.id}`}
                          />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[11px] font-bold text-indigo-300 border border-indigo-500/40 uppercase">
                              {batch.method} DEPOSIT
                            </span>
                            <span className="font-mono text-xs text-slate-400">ID: {batch.id}</span>
                            {isSelected && (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                                SELECTED FOR BULK
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-black text-white mt-1">
                            Advertiser Request: ${batch.requested_amount} USD{' '}
                            <span className="text-xs font-normal text-slate-400 font-mono">
                              ({batch.requested_amount * 10} pts)
                            </span>
                          </h3>
                          <p className="text-xs text-slate-300 font-mono">
                            Advertiser: {batch.advertiser_id} • Created{' '}
                            {new Date(batch.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectBatchId(batch.id)}
                          disabled={processingId === batch.id || isBulkProcessing}
                          className="border-red-400/40 text-red-300 bg-red-950/40 hover:bg-red-900/60 hover:text-white text-xs h-9"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject Single
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(batch)}
                          disabled={processingId === batch.id || isBulkProcessing}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-5 shadow"
                        >
                          {processingId === batch.id ? (
                            'Approving...'
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1.5" />
                              Approve Single
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
                              const isAltSelected = selectedAltId === alt.id;
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
                                    isAltSelected
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
                                      checked={isAltSelected}
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
                          ${b.requested_amount}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({b.requested_amount * 10} pts)
                          </span>
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

      {/* FLOATING BULK ACTION TOOLBAR */}
      {selectedPendingBatches.length > 0 && filterTab === 'pending' && (
        <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-3xl w-full animate-in slide-in-from-bottom-5 duration-200">
          <div className="rounded-2xl bg-slate-950/95 text-white border-2 border-indigo-500/60 shadow-2xl p-4 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left: Summary info */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 font-extrabold text-white text-sm shadow">
                  {selectedPendingBatches.length}
                </span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Batches Selected</span>
                    <span className="text-indigo-400 font-mono">
                      (${totalSelectedUsd.toLocaleString()} USD)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Equivalent to {totalSelectedPoints.toLocaleString()} points
                  </div>
                </div>
              </div>

              <button
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-white underline sm:ml-2"
              >
                Clear
              </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkRejectModal(true)}
                disabled={isBulkProcessing}
                className="border-red-400/50 bg-red-950/50 text-red-300 hover:bg-red-900 hover:text-white text-xs h-9 font-semibold"
              >
                <X className="h-4 w-4 mr-1" />
                Reject ({selectedPendingBatches.length})
              </Button>

              <Button
                size="sm"
                onClick={() => setShowBulkApproveModal(true)}
                disabled={isBulkProcessing}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs h-9 px-5 shadow-lg shadow-emerald-950/50"
              >
                <CheckCheck className="h-4 w-4 mr-1.5" />
                Approve ({selectedPendingBatches.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BULK APPROVE MODAL */}
      {showBulkApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-lg border-b border-slate-100 pb-3">
              <CheckCheck className="h-6 w-6 text-emerald-600" />
              <span>Confirm Bulk Batch Approval</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to authorize and lock{' '}
              <strong className="text-slate-900 font-bold">{selectedPendingBatches.length} deposit batches</strong>{' '}
              totaling <strong className="text-emerald-700 font-mono font-bold">${totalSelectedUsd.toLocaleString()} USD</strong>{' '}
              ({totalSelectedPoints.toLocaleString()} pts).
            </p>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Batches to be approved:
              </span>
              {selectedPendingBatches.map((b) => {
                const chosenAltId = selectedAlternatives[b.id];
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{b.id}</span>{' '}
                      <span className="text-slate-500 uppercase">({b.method})</span>
                      <div className="text-[10px] text-slate-400 font-sans">
                        Adv: {b.advertiser_id} {chosenAltId ? '• Alternative Strategy' : '• AI Default'}
                      </div>
                    </div>
                    <div className="text-right font-bold text-emerald-700 font-mono">
                      ${b.requested_amount} USD
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <p className="font-semibold">Automated actions on confirmation:</p>
              <ul className="list-disc list-inside text-[11px] mt-1 space-y-0.5 text-emerald-700">
                <li>Locks candidates and assigns matching claims to advertisers</li>
                <li>Generates encrypted settlement QR codes for peer-to-peer payout</li>
                <li>Updates shared ledger state in real-time</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setShowBulkApproveModal(false)}
                disabled={isBulkProcessing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkApprove}
                disabled={isBulkProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Confirm & Approve (${selectedPendingBatches.length})`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BULK REJECT MODAL */}
      {showBulkRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-red-600 font-bold text-lg border-b border-slate-100 pb-3">
              <X className="h-6 w-6" />
              <span>Confirm Bulk Batch Rejection</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Rejecting <strong className="text-slate-900 font-bold">{selectedPendingBatches.length} deposit batches</strong>{' '}
              will immediately release all candidate withdrawal requests back into the open liquidity pool for other advertisers.
            </p>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Batches to be rejected:
              </span>
              {selectedPendingBatches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 text-xs font-mono"
                >
                  <span className="text-slate-700 font-bold">{b.id} ({b.method.toUpperCase()})</span>
                  <span className="text-red-600 font-bold">${b.requested_amount} USD</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Rejection (Applied to all selected batches)
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-red-500 focus:outline-none"
                rows={2}
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setShowBulkRejectModal(false)}
                disabled={isBulkProcessing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkReject}
                disabled={isBulkProcessing}
                className="text-xs font-bold"
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  `Confirm Rejection (${selectedPendingBatches.length})`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal (Single) */}
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
