'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  ArrowDownToLine,
  CheckSquare,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Cpu,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const { currentUser } = useUser();
  const [stats, setStats] = useState({
    totalLiquidity: 0,
    totalCount: 0,
    greenCount: 0,
    blueCount: 0,
    orangeCount: 0,
    redCount: 0,
  });
  const [pendingBatchesCount, setPendingBatchesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([sdeedpayApi.getPool(), sdeedpayApi.getBatches('pending_admin')])
      .then(([poolRes, batchesRes]) => {
        setStats(poolRes.stats);
        setPendingBatchesCount(batchesRes.length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Welcome */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                sdeedpay v1.1.0
              </span>
              <span className="text-xs text-slate-400">Smart Payments Bank</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Kamekaz Shared Liquidity Ledger
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Decentralized P2P cash settlements between couriers, drivers, and advertising
              agencies powered by the Smart AI Combination Optimizer (1 Point = 1 USD).
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/wallet">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9">
                <Wallet className="h-4 w-4 mr-1.5" />
                Worker Cashout
              </Button>
            </Link>
            <Link href="/deposit/request">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9">
                <ArrowDownToLine className="h-4 w-4 mr-1.5" />
                Deposit Funding
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Liquidity */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Pool Total Liquidity</span>
              <Layers className="h-4 w-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-slate-900">
              ${stats.totalLiquidity}{' '}
              <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.totalCount} active withdrawal requests
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Pending Batches */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>AI Batches in Queue</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-amber-600">
              {pendingBatchesCount}{' '}
              <span className="text-xs font-normal text-slate-400">Pending</span>
            </div>
            <Link href="/admin/batches" className="text-[11px] text-indigo-600 hover:underline mt-1 block">
              Review in Approval Center &rarr;
            </Link>
          </CardContent>
        </Card>

        {/* Metric 3: Big Bills Preservation ($50+) */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Protected Big Bills ($50+)</span>
              <ShieldCheck className="h-4 w-4 text-rose-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-rose-700">
              {stats.redCount}{' '}
              <span className="text-xs font-normal text-slate-400">Bills Reserved</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Reserved for high-tier advertisers
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Platform Commission */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Commission Routing</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-emerald-700">
              1 : 9 <span className="text-xs font-normal text-slate-400">Ratio</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Auto platform treasury fee per 9 claims
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Feature Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: AI Suggestion Engine Rules & Liquidity Colors */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-600" />
                AI Suggestion Engine & Rules Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                <span className="font-bold text-indigo-950 block">4 Core Optimization Directives:</span>
                <ul className="space-y-1.5 text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5">
                      P1
                    </span>
                    <span>
                      <strong>Exact Match with Fewest Transfers:</strong> Groups worker requests into
                      cards matching the advertiser&apos;s requested amount.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5">
                      P2
                    </span>
                    <span>
                      <strong>Preserve Large Bills (&ge;$50):</strong> Never breaks $50+ bills for small
                      deposit requests (&lt;$50) if smaller combinations exist.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5">
                      P3
                    </span>
                    <span>
                      <strong>Liquidity Floor:</strong> Retains at least 1x$50 and 1x$40 in the open pool
                      for high-volume advertisers.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5">
                      P4
                    </span>
                    <span>
                      <strong>FIFO Order:</strong> Oldest requests within the same denomination are
                      cleared first.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Color Tag Bar */}
              <div>
                <span className="font-bold text-slate-700 block mb-2">Denomination Color Coding:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-emerald-800">Green</span>
                    <p className="font-bold font-mono text-emerald-950 text-sm">$10 Bills</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-blue-800">Blue</span>
                    <p className="font-bold font-mono text-blue-950 text-sm">$20 Bills</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-amber-800">Orange</span>
                    <p className="font-bold font-mono text-amber-950 text-sm">$30 - $40 Bills</p>
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-rose-800">Red</span>
                    <p className="font-bold font-mono text-rose-950 text-sm">$50+ Big Bills</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Action Hub */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Quick Navigation Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Link href="/wallet" className="block">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Worker Wallet</h4>
                      <p className="text-[11px] text-slate-500">Request cashout & join liquidity pool</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>

              <Link href="/deposit/request" className="block">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                      <ArrowDownToLine className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Advertiser Deposit Request</h4>
                      <p className="text-[11px] text-slate-500">Request amount & get AI suggestions</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>

              <Link href="/admin/batches" className="block">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-rose-400 hover:bg-rose-50/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                      <CheckSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Admin Batches Approval</h4>
                      <p className="text-[11px] text-slate-500">Review combinations & issue cards</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>

              <Link href="/admin/pool" className="block">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Liquidity Pool Colors</h4>
                      <p className="text-[11px] text-slate-500">Monitor Green/Blue/Orange/Red bills</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
