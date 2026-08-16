'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { SpDepositClaim } from '@/lib/sdeedpay-types';
import { ReceiptText, Download, Filter, Search, RefreshCw, ShieldCheck } from 'lucide-react';

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
      // Fetch pool and batches to reconstruct all settled transfers
      const pool = await sdeedpayApi.getPool();
      const batches = await sdeedpayApi.getBatches();

      // Collect all cards across approved batches
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              Audit & Treasury Ledger
            </span>
            <span className="text-xs text-slate-400 font-mono">1 Pt = 1 USD</span>
          </div>
          <h1 className="text-2xl font-bold text-white">System Settlement Ledger</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Cryptographically logged P2P transfer claims, beneficiary cards, and 1:9 platform commission routing.
          </p>
        </div>

        <Button
          onClick={exportCsv}
          className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs h-9"
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export Ledger CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
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
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search reference, card, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button size="sm" variant="outline" onClick={loadTransactions} className="h-8 text-xs">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-xs text-slate-400">Loading ledger records...</p>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ReceiptText className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No settled claims match criteria</p>
              <p className="text-xs text-slate-400 mt-1">
                Approve batches in the Admin Batches portal to generate live settlement records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500 text-[10px]">
                  <tr>
                    <th className="p-3.5">Claim / Card ID</th>
                    <th className="p-3.5">Batch Reference</th>
                    <th className="p-3.5">Amount (USD)</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Beneficiary / Wallet</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Reference ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((claim) => (
                    <tr key={claim.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono text-slate-800">{claim.id}</td>
                      <td className="p-3.5 font-mono text-slate-500">{claim.batch_id}</td>
                      <td className="p-3.5 font-black font-mono text-slate-900 text-sm">
                        ${claim.amount}
                      </td>
                      <td className="p-3.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {claim.method}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">
                          {claim.beneficiary_full_name || 'Masked Beneficiary'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {claim.wallet_number} ({claim.governorate})
                        </div>
                      </td>
                      <td className="p-3.5">
                        {claim.is_platform_commission ? (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                            <ShieldCheck className="h-3 w-3" />
                            Platform Fee (1:9)
                          </span>
                        ) : (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            P2P Settlement
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant={
                            claim.status === 'matched'
                              ? 'success'
                              : claim.status === 'disputed'
                              ? 'danger'
                              : claim.status === 'advertiser_sent'
                              ? 'warning'
                              : 'default'
                          }
                          className="uppercase text-[10px] font-bold"
                        >
                          {claim.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {claim.advertiser_reference || 'Pending Ref'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
