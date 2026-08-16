'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { SpWithdrawalRequest, PaymentMethod, ColorTag } from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Layers,
  Filter,
  DollarSign,
  Search,
  RefreshCw,
  Clock,
  Sparkles,
  TrendingUp,
  MapPin,
  QrCode,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

export default function AdminPoolPage() {
  const { currentUser } = useUser();
  const [requests, setRequests] = useState<SpWithdrawalRequest[]>([]);
  const [stats, setStats] = useState<{
    totalLiquidity: number;
    totalCount: number;
    greenCount: number;
    blueCount: number;
    orangeCount: number;
    redCount: number;
    byMethod: Record<PaymentMethod, number>;
  }>({
    totalLiquidity: 0,
    totalCount: 0,
    greenCount: 0,
    blueCount: 0,
    orangeCount: 0,
    redCount: 0,
    byMethod: { omt: 0, wish: 0, haram: 0, shamcash: 0 },
  });

  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected request modal
  const [inspectRequest, setInspectRequest] = useState<SpWithdrawalRequest | null>(null);

  useEffect(() => {
    loadPool();
  }, [selectedColor, selectedMethod]);

  async function loadPool() {
    setLoading(true);
    try {
      const methodFilter = selectedMethod !== 'all' ? (selectedMethod as PaymentMethod) : undefined;
      const colorFilter = selectedColor !== 'all' ? selectedColor : undefined;
      const res = await sdeedpayApi.getPool(methodFilter, colorFilter);
      setRequests(res.requests);
      setStats(res.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const colorConfig: Record<
    ColorTag,
    { label: string; desc: string; bg: string; border: string; text: string; dot: string }
  > = {
    green: {
      label: 'Green Tag',
      desc: '$10 Bills (Micro-Liquidity)',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    blue: {
      label: 'Blue Tag',
      desc: '$20 Bills',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    },
    orange: {
      label: 'Orange Tag',
      desc: '$30 - $40 Bills (Mid-Tier)',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    },
    red: {
      label: 'Red Tag',
      desc: '$50+ Bills (Big Bills - Protected)',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-800',
      dot: 'bg-rose-500',
    },
  };

  const filteredRequests = requests.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = r.id.toLowerCase().includes(q);
      const matchUser = r.user_id.toLowerCase().includes(q);
      const matchName = (r.full_name || '').toLowerCase().includes(q);
      const matchGov = r.governorate.toLowerCase().includes(q);
      const matchWallet = r.wallet_number.toLowerCase().includes(q);
      if (!matchId && !matchUser && !matchName && !matchGov && !matchWallet) return false;
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
              Admin Liquidity Supervision
            </span>
            <span className="text-xs text-slate-400 font-mono">Live P2P Reservoir</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Color-Coded Liquidity Pool</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Real-time visual monitoring of all active in_pool worker withdrawal requests
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-md text-right">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">
              Total Open Liquidity
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              ${stats.totalLiquidity}{' '}
              <span className="text-xs font-normal text-slate-300">USD</span>
            </div>
            <span className="text-[11px] text-slate-400">{stats.totalCount} active requests</span>
          </div>
        </div>
      </div>

      {/* 4 Color Denomination Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Green: $10 */}
        <div
          onClick={() => setSelectedColor(selectedColor === 'green' ? 'all' : 'green')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            selectedColor === 'green'
              ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-500'
              : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 shadow-sm" />
              <span className="text-xs font-bold text-slate-900">Green Tag ($10)</span>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 text-[10px] border-emerald-300">
              Micro
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-emerald-950">
              {stats.greenCount}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              ${stats.greenCount * 10} USD
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Fast micro-transfers & small cashouts</p>
        </div>

        {/* Blue: $20 */}
        <div
          onClick={() => setSelectedColor(selectedColor === 'blue' ? 'all' : 'blue')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            selectedColor === 'blue'
              ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500'
              : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-blue-500 shadow-sm" />
              <span className="text-xs font-bold text-slate-900">Blue Tag ($20)</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-800 text-[10px] border-blue-300">
              Standard
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-blue-950">
              {stats.blueCount}
            </span>
            <span className="text-xs font-bold text-blue-700">
              ${stats.blueCount * 20} USD
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Standard courier payout denomination</p>
        </div>

        {/* Orange: $30 / $40 */}
        <div
          onClick={() => setSelectedColor(selectedColor === 'orange' ? 'all' : 'orange')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            selectedColor === 'orange'
              ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-500'
              : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-amber-500 shadow-sm" />
              <span className="text-xs font-bold text-slate-900">Orange Tag ($30-$40)</span>
            </div>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 text-[10px] border-amber-300">
              Mid-Tier
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-amber-950">
              {stats.orangeCount}
            </span>
            <span className="text-xs font-bold text-amber-700">
              Mid Bills
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Protected for &gt;$50 advertiser deposits</p>
        </div>

        {/* Red: $50+ */}
        <div
          onClick={() => setSelectedColor(selectedColor === 'red' ? 'all' : 'red')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            selectedColor === 'red'
              ? 'border-rose-500 bg-rose-50 shadow-md ring-2 ring-rose-500'
              : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full bg-rose-500 shadow-sm" />
              <span className="text-xs font-bold text-slate-900">Red Tag ($50+ Big Bills)</span>
            </div>
            <Badge variant="outline" className="bg-rose-50 text-rose-800 text-[10px] border-rose-300 font-bold">
              AI Protected
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black font-mono text-rose-950">
              {stats.redCount}
            </span>
            <span className="text-xs font-bold text-rose-700">
              Big Bills
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Never broken for small deposits (&lt;50)
          </p>
        </div>
      </div>

      {/* Liquidity Breakdown by Payment Channel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OMT Cash</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            ${stats.byMethod.omt} USD
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wish Money</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            ${stats.byMethod.wish} USD
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Haram Transfer</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            ${stats.byMethod.haram} USD
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ShamCash</span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
            ${stats.byMethod.shamcash} USD
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Method Filter */}
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
          >
            <option value="all">All Payment Channels</option>
            <option value="omt">OMT (Cash)</option>
            <option value="wish">Wish Money</option>
            <option value="haram">Haram Transfer</option>
            <option value="shamcash">ShamCash</option>
          </select>

          {/* Color Filter */}
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
          >
            <option value="all">All Denomination Colors</option>
            <option value="green">Green ($10)</option>
            <option value="blue">Blue ($20)</option>
            <option value="orange">Orange ($30-$40)</option>
            <option value="red">Red ($50+ Protected)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search user, name, region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button size="sm" variant="outline" onClick={loadPool} className="h-8 text-xs">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Pool Table Grid */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-xs text-slate-400">Loading pool liquidity...</p>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No requests match current filter</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the color or channel filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500 text-[10px]">
                  <tr>
                    <th className="p-3.5">Color Tag</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Worker / Beneficiary</th>
                    <th className="p-3.5">Wallet / Mobile</th>
                    <th className="p-3.5">Region</th>
                    <th className="p-3.5">Pool Time</th>
                    <th className="p-3.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const cfg = colorConfig[req.color_tag] || colorConfig.green;
                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${cfg.bg} ${cfg.border} ${cfg.text}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                            {req.color_tag}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold font-mono text-slate-900 text-sm">
                          ${req.amount} USD
                        </td>
                        <td className="p-3.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                            {req.method}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">
                            {req.full_name || 'Anonymous Courier'}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">{req.user_id}</div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-700">{req.wallet_number}</td>
                        <td className="p-3.5 text-slate-600">{req.governorate}</td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(req.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setInspectRequest(req)}
                            className="h-7 text-[11px]"
                          >
                            Details
                          </Button>
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

      {/* Inspect Request Modal */}
      {inspectRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900">Withdrawal Request Info</span>
                <Badge className="font-mono uppercase text-[10px]">
                  {inspectRequest.color_tag}
                </Badge>
              </div>
              <button
                onClick={() => setInspectRequest(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 flex items-center justify-between">
                <span className="font-bold text-slate-600">Withdrawal Amount:</span>
                <span className="text-xl font-black font-mono text-slate-900">
                  ${inspectRequest.amount} USD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2.5">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Method</span>
                  <span className="font-bold uppercase text-slate-800">{inspectRequest.method}</span>
                </div>
                <div className="rounded-lg border p-2.5">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Region</span>
                  <span className="font-semibold text-slate-800">{inspectRequest.governorate}</span>
                </div>
              </div>

              <div className="rounded-lg border p-2.5 space-y-1">
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Beneficiary Name</span>
                <span className="font-semibold text-slate-900">
                  {inspectRequest.full_name || 'N/A (Masked)'}
                </span>
                <span className="text-[10px] uppercase text-slate-400 font-bold block pt-1">
                  Wallet / Mobile
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {inspectRequest.wallet_number}
                </span>
              </div>

              {inspectRequest.qr_code_url && (
                <div className="text-center pt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inspectRequest.qr_code_url}
                    alt="QR"
                    className="mx-auto h-28 w-28 rounded border p-1 bg-white"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={() => setInspectRequest(null)}
              className="w-full bg-slate-900 text-white text-xs h-9"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
