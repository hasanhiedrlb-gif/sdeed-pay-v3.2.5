'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { SpDepositClaim, PaymentMethod } from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  User,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';

export default function DepositBatchDetailPage() {
  const params = useParams<{ batchId: string }>();
  const batchId = decodeURIComponent(params.batchId);
  const router = useRouter();
  const { currentUser, refreshUsers } = useUser();

  const [batchInfo, setBatchInfo] = useState<{
    batch_id: string;
    status: string;
    requested_amount: number;
    method: PaymentMethod;
  } | null>(null);

  const [cards, setCards] = useState<SpDepositClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload proof modal/form state
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [reference, setReference] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dispute state
  const [disputeClaimId, setDisputeClaimId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputing, setDisputing] = useState(false);

  useEffect(() => {
    loadCards();
  }, [batchId]);

  async function loadCards() {
    setLoading(true);
    setError(null);
    try {
      const res = await sdeedpayApi.getBatchCards(batchId);
      setBatchInfo({
        batch_id: res.batch_id,
        status: res.status,
        requested_amount: res.requested_amount,
        method: res.method,
      });
      setCards(res.cards);
    } catch (err: any) {
      setError(err?.message || 'Failed to load cards for this batch');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, fieldId: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleProofSubmit(claimId: string) {
    if (!proofUrl && !reference) {
      alert('Please provide a reference number or proof image URL');
      return;
    }

    setUploading(true);
    try {
      await sdeedpayApi.submitProof(
        claimId,
        proofUrl || `https://storage.sdeed.com/receipts/proof_${Date.now()}.png`,
        reference || `TX-REF-${Date.now().toString().slice(-6)}`,
        'advertiser',
      );
      setActiveClaimId(null);
      setProofUrl('');
      setReference('');
      await loadCards();
      await refreshUsers();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit proof');
    } finally {
      setUploading(false);
    }
  }

  async function handleDisputeSubmit(claimId: string) {
    if (!disputeReason) return;
    setDisputing(true);
    try {
      await sdeedpayApi.disputeClaim(claimId, disputeReason);
      setDisputeClaimId(null);
      setDisputeReason('');
      await loadCards();
    } catch (err: any) {
      alert(err?.message || 'Failed to dispute claim');
    } finally {
      setDisputing(false);
    }
  }

  const allMatched = cards.length > 0 && cards.every((c) => c.status === 'matched');
  const totalSentCount = cards.filter((c) => c.status !== 'advertiser_sent' || c.advertiser_proof_url).length;

  return (
    <div className="space-y-6">
      {/* Header Back & Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/deposit/request">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-slate-700">
              <ArrowLeft className="h-4 w-4" />
              Back to Deposits
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Approved Payment Cards</h1>
              <Badge
                variant={batchInfo?.status === 'approved' ? 'success' : 'default'}
                className="uppercase font-bold text-[10px]"
              >
                {batchInfo?.status || 'Active'}
              </Badge>
            </div>
            <p className="font-mono text-xs text-slate-500">Batch ID: {batchId}</p>
          </div>
        </div>

        {batchInfo && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2 text-right">
            <span className="text-[11px] font-semibold uppercase text-indigo-700">
              Total Batch Allocation
            </span>
            <div className="text-xl font-extrabold text-indigo-950 font-mono">
              ${batchInfo.requested_amount} USD{' '}
              <span className="text-xs font-normal text-slate-500">({batchInfo.method.toUpperCase()})</span>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <Link href="/deposit/request" className="mt-3 inline-block">
            <Button variant="outline">Return to Deposit Requests</Button>
          </Link>
        </Card>
      ) : loading ? (
        <Card className="p-12 text-center text-slate-400">Loading payout cards...</Card>
      ) : (
        <div className="space-y-6">
          {/* Progress Tracker Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Payout Execution Status ({totalSentCount} of {cards.length} transfers submitted)
              </span>
              <span className="font-bold font-mono text-indigo-600">
                {Math.round((totalSentCount / (cards.length || 1)) * 100)}% Completed
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                style={{ width: `${(totalSentCount / (cards.length || 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Please transfer the exact amount specified on each card to the recipient details below,
              then upload your receipt / transaction reference.
            </p>
          </div>

          {/* Individual Payment Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card, index) => {
              const isHaramOrOmt = card.method === 'haram' || card.method === 'omt';
              const isPlatform = card.is_platform_commission;
              const hasProof = Boolean(card.advertiser_proof_url);
              const isMatched = card.status === 'matched';
              const isDisputed = card.status === 'disputed';

              return (
                <Card
                  key={card.id}
                  className={`overflow-hidden border transition-all ${
                    isMatched
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : isDisputed
                      ? 'border-red-300 bg-red-50/20'
                      : hasProof
                      ? 'border-amber-300 bg-amber-50/10'
                      : isPlatform
                      ? 'border-indigo-300 bg-indigo-50/20'
                      : 'border-slate-200 bg-white shadow-sm hover:shadow'
                  }`}
                >
                  {/* Card Header with Amount */}
                  <div
                    className={`p-4 border-b flex items-center justify-between ${
                      isPlatform
                        ? 'bg-indigo-900 text-white'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-indigo-300" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Card #{index + 1} {isPlatform ? '(Platform Treasury Fee)' : ''}
                        </span>
                      </div>
                      <div className="text-2xl font-black font-mono mt-0.5 text-white">
                        ${card.amount} <span className="text-xs font-normal text-slate-300">USD</span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        isMatched
                          ? 'success'
                          : isDisputed
                          ? 'danger'
                          : hasProof
                          ? 'warning'
                          : 'outline'
                      }
                      className="uppercase font-bold text-[10px]"
                    >
                      {isMatched
                        ? 'Matched'
                        : isDisputed
                        ? 'Disputed'
                        : hasProof
                        ? 'Proof Sent'
                        : 'Ready to Pay'}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-4 text-xs">
                    {/* Method & Privacy Notice */}
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 border border-slate-100">
                      <span className="font-bold uppercase text-slate-700">{card.method}</span>
                      <span className="text-[11px] text-slate-500">
                        {isHaramOrOmt
                          ? 'Full beneficiary name verified'
                          : 'Privacy mode: Name hidden by system'}
                      </span>
                    </div>

                    {/* Beneficiary Details */}
                    <div className="space-y-2.5">
                      {/* Beneficiary Full Name (if Haram or OMT) */}
                      {isHaramOrOmt && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Recipient Full Legal Name
                          </span>
                          <div className="flex items-center justify-between font-semibold text-slate-900 mt-0.5">
                            <span>{card.beneficiary_full_name || 'Verified Beneficiary'}</span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  card.beneficiary_full_name || '',
                                  `name_${card.id}`,
                                )
                              }
                              className="text-slate-400 hover:text-indigo-600 transition"
                            >
                              {copiedField === `name_${card.id}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Wallet / Phone Number */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Wallet / Mobile Number
                        </span>
                        <div className="flex items-center justify-between font-mono font-bold text-slate-900 bg-slate-50 p-2 rounded border border-slate-200 mt-0.5">
                          <span>{card.wallet_number}</span>
                          <button
                            onClick={() =>
                              copyToClipboard(card.wallet_number, `wallet_${card.id}`)
                            }
                            className="text-slate-400 hover:text-indigo-600 transition"
                          >
                            {copiedField === `wallet_${card.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Governorate */}
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px] text-slate-400">Region:</span>
                        <span className="font-medium">{card.governorate}</span>
                      </div>
                    </div>

                    {/* QR Code Preview */}
                    {card.qr_code_url && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Quick Scan QR
                        </span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={card.qr_code_url}
                          alt="Payment QR"
                          className="mx-auto h-24 w-24 rounded border border-slate-200 bg-white p-1 shadow-xs"
                        />
                      </div>
                    )}

                    {/* Proof Status & Submission */}
                    <div className="border-t border-slate-100 pt-3">
                      {isMatched ? (
                        <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-800 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          <div>
                            <p className="font-bold">Transfer Settled</p>
                            <p className="text-[10px] text-emerald-600">
                              Points added to your advertiser balance.
                            </p>
                          </div>
                        </div>
                      ) : hasProof ? (
                        <div className="space-y-2">
                          <div className="rounded-lg bg-amber-50 p-2.5 text-amber-800 flex items-center gap-2">
                            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                            <div>
                              <p className="font-bold">Proof Submitted</p>
                              <p className="text-[10px] text-amber-600 font-mono">
                                Ref: {card.advertiser_reference || 'Attached'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setActiveClaimId(card.id);
                                setReference(card.advertiser_reference || '');
                              }}
                              className="text-[11px] text-indigo-600 hover:underline"
                            >
                              Update Receipt
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              onClick={() => setDisputeClaimId(card.id)}
                              className="text-[11px] text-red-600 hover:underline"
                            >
                              Report Issue / Dispute
                            </button>
                          </div>
                        </div>
                      ) : activeClaimId === card.id ? (
                        /* Upload Form */
                        <div className="space-y-2 rounded-lg bg-slate-50 p-3 border border-indigo-200">
                          <span className="font-bold text-slate-800 block text-xs">
                            Upload Transfer Proof
                          </span>
                          <Input
                            placeholder="Transaction Reference (e.g. OMT-78912)"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            className="text-xs h-8"
                          />
                          <Input
                            placeholder="Receipt Image URL (or paste link)"
                            value={proofUrl}
                            onChange={(e) => setProofUrl(e.target.value)}
                            className="text-xs h-8"
                          />
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              disabled={uploading}
                              onClick={() => handleProofSubmit(card.id)}
                              className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            >
                              {uploading ? 'Submitting...' : 'Confirm Sent'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveClaimId(null)}
                              className="h-8 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setActiveClaimId(card.id);
                              setReference(`OMT-${Math.floor(100000 + Math.random() * 900000)}`);
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-8 text-xs flex items-center justify-center gap-1.5"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload Transfer Receipt
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Dispute Dialog */}
          {disputeClaimId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                  <AlertTriangle className="h-5 w-5" />
                  Flag Transfer for Admin Dispute
                </div>
                <p className="text-xs text-slate-600">
                  Provide details regarding any payment issue or mismatched recipient details. Our
                  Bank Supervisor will review and hold funds.
                </p>
                <textarea
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-red-500 focus:outline-none"
                  rows={3}
                  placeholder="Describe issue (e.g. Beneficiary phone unreachable or OMT agent system error)..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDisputeClaimId(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={disputing || !disputeReason}
                    onClick={() => handleDisputeSubmit(disputeClaimId)}
                    className="text-xs"
                  >
                    {disputing ? 'Submitting...' : 'Submit Dispute'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
