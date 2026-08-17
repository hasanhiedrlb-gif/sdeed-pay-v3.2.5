'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { SpDepositClaim } from '@/lib/sdeedpay-types';
import { ReceiptText, Download, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import { CountUp } from '@/components/CountUp';

export default function TransactionsPage() {
  const [claims, setClaims] = useState<SpDepositClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      const batches = await sdeedpayApi.getBatches();
      const allCards: SpDepositClaim[] = [];
      for (const b of batches) {
        if (b.status === 'approved' || b.status === 'completed') {
          try {
            const cardRes = await sdeedpayApi.getBatchCards(b.id);
            allCards.push(...cardRes.cards);
          } catch (e) {
            // continue
          }
        }
      }
      setClaims(allCards);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const header = [
      'id',
      'batch_id',
      'withdrawal_request_id',
      'amount_usd',
      'method',
      'beneficiary_full_name',
      'wallet_number',
      'status',
      'is_platform_commission',
      'advertiser_reference',
    ];
    const rows = claims.map((c) =>
      [
        c.id,
        c.batch_id,
        c.withdrawal_request_id,
        c.amount,
        c.method,
        c.beneficiary_full_name || 'N/A',
        c.wallet_number,
        c.status,
        c.is_platform_commission ? 'YES' : 'NO',
        c.advertiser_reference || 'N/A',
      ]
        .map((h) => `"${String(h ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sdeedpay-ledger-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = claims.filter((c) => {
    if (methodFilter !== 'all' && c.method !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchBatch = c.batch_id.toLowerCase().includes(q);
      const matchWallet = c.wallet_number.toLowerCase().includes(q);
      const matchRef = (c.advertiser_reference || '').toLowerCase().includes(q);
      if (!matchId && !matchBatch && !matchWallet && !matchRef) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-blue-950/70 via-slate-900/80 to-blue-950/70 p-7 text-[#F8FAFC] shadow-2xl backdrop-blur-[24px]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#4F8AFF]/20 blur-[90px]" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-[#4F8AFF]/20 px-3 py-0.5 text-xs font-bold text-[#38BDF8] border border-[#4F8AFF]/40 shadow-sm">
                Audit & Treasury Ledger
              </span>
              <span className="text-xs text-[#94A3B8] font-mono">10 Pts = $1.00 USD</span>
            </div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">System Settlement Ledger</h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Cryptographically logged P2P transfer claims, beneficiary cards, and 1:9 platform commission routing.
            </p>
          </div>

          <Button
            onClick={exportCsv}
            variant="outline"
            className="font-bold text-xs h-10 px-4"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export Ledger CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-[20px] p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-xl border border-white/15 bg-slate-950/80 px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] focus:outline-none focus:border-[#4F8AFF] focus:ring-1 focus:ring-[#4F8AFF]"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Payment Channels</option>
            <option value="omt">OMT (Cash)</option>
            <option value="wish">Wish Money</option>
            <option value="haram">Haram</option>
            <option value="shamcash">ShamCash</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
            <Input
              placeholder="Search reference, card, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button size="sm" variant="outline" onClick={loadTransactions} className="h-9 w-9 p-0">
            <RefreshCw className="h-3.5 w-3.5 text-[#94A3B8]" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-xs text-[#94A3B8]">Loading ledger records...</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-[#94A3B8] mb-2" />
              <p className="text-sm font-semibold text-[#F8FAFC]">No settled claims match criteria</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Approve batches in the Admin Batches portal to generate live settlement records.
              </p>
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Claim / Card ID</TH>
                  <TH>Batch Reference</TH>
                  <TH>Amount (USD)</TH>
                  <TH>Method</TH>
                  <TH>Beneficiary / Wallet</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Reference ID</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((claim) => (
                  <TR key={claim.id} className="hover:bg-white/[0.06] transition">
                    <TD className="font-mono text-[#38BDF8]">{claim.id}</TD>
                    <TD className="font-mono text-[#94A3B8]">{claim.batch_id}</TD>
                    <TD className="font-black font-mono text-emerald-400 text-sm">
                      ${claim.amount}
                    </TD>
                    <TD>
                      <span className="rounded-lg bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#F8FAFC]">
                        {claim.method}
                      </span>
                    </TD>
                    <TD>
                      <div className="font-semibold text-[#F8FAFC]">{claim.beneficiary_full_name || 'Direct Payout'}</div>
                      <div className="font-mono text-[10px] text-[#94A3B8]">{claim.wallet_number}</div>
                    </TD>
                    <TD>
                      {claim.is_platform_commission ? (
                        <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[9px] font-bold">
                          1:9 Commission
                        </span>
                      ) : (
                        <span className="rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[9px] font-bold">
                          Direct Settlement
                        </span>
                      )}
                    </TD>
                    <TD>
                      <Badge variant="success" className="text-[10px] font-bold">
                        {claim.status}
                      </Badge>
                    </TD>
                    <TD className="font-mono text-xs text-[#94A3B8]">
                      {claim.advertiser_reference || 'REF-SETTLED'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
