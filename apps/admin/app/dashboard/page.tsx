'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import { PoolStats } from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  ArrowDownToLine,
  CheckSquare,
  Layers,
  Sparkles,
  TrendingUp,
  Clock,
  ShieldCheck,
  Cpu,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<PoolStats>({
    totalLiquidity: 0,
    totalCount: 0,
    greenCount: 0,
    blueCount: 0,
    orangeCount: 0,
    redCount: 0,
  });
  const [pendingBatchesCount, setPendingBatchesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([sdeedpayApi.getPool(), sdeedpayApi.getBatches('pending')])
      .then(([poolRes, batchesRes]) => {
        setStats(poolRes.stats);
        setPendingBatchesCount(batchesRes.length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Glass Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-r from-blue-950/70 via-slate-900/80 to-blue-950/70 p-7 text-[#F8FAFC] shadow-2xl backdrop-blur-[24px]">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#4F8AFF]/20 blur-[90px]" />
        
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-[#4F8AFF]/20 px-3 py-1 text-xs font-bold text-[#38BDF8] border border-[#4F8AFF]/40 flex items-center gap-1.5 backdrop-blur-md shadow-[0_0_12px_rgba(79,138,255,0.3)]">
                <Sparkles className="h-3.5 w-3.5" />
                sdeedpay v1.1.0 Panel
              </span>
              <span className="text-xs text-[#94A3B8]">Smart Payments Bank</span>
            </div>
            <h1 className="text-3xl font-black text-[#F8FAFC] tracking-tight">
              Kamekaz Shared Liquidity Ledger
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
              Decentralized P2P cash settlements between couriers, drivers, and advertising
              agencies powered by the Smart AI Combination Optimizer (10 Point = $1.00 USD).
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/wallet">
              <Button size="sm" className="bg-emerald-500/80 hover:bg-emerald-600 border border-emerald-400/30 text-white font-bold text-xs h-10 px-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Wallet className="h-4 w-4 mr-1.5" />
                Worker Cashout
              </Button>
            </Link>
            <Link href="/deposit/request">
              <Button size="sm" className="h-10 px-4">
                <ArrowDownToLine className="h-4 w-4 mr-1.5" />
                Deposit Funding
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Key Metrics Cards in Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Liquidity */}
        <Card className="glass-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
              <span>Pool Total Liquidity</span>
              <div className="p-1.5 rounded-lg bg-[#4F8AFF]/20 text-[#38BDF8] border border-[#4F8AFF]/30">
                <Layers className="h-4 w-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-[#F8FAFC]">
              ${stats.totalLiquidity}{' '}
              <span className="text-xs font-normal text-[#94A3B8]">USD</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              {stats.totalCount} active withdrawal requests
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Pending Batches */}
        <Card className="glass-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
              <span>AI Batches in Queue</span>
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Clock className="h-4 w-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-amber-300">
              {pendingBatchesCount}{' '}
              <span className="text-xs font-normal text-[#94A3B8]">Pending</span>
            </div>
            <Link href="/admin/batches" className="text-[11px] text-[#38BDF8] hover:underline mt-1 block font-medium">
              Review in Approval Center &rarr;
            </Link>
          </CardContent>
        </Card>

        {/* Metric 3: Big Bills Preservation ($50+) */}
        <Card className="glass-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
              <span>Protected Big Bills ($50+)</span>
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-rose-300">
              {stats.redCount}{' '}
              <span className="text-xs font-normal text-[#94A3B8]">Bills Reserved</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Reserved for high-tier advertisers
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Platform Commission */}
        <Card className="glass-card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center justify-between">
              <span>Commission Routing</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-emerald-300">
              1 : 9 <span className="text-xs font-normal text-[#94A3B8]">Ratio</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              Auto platform treasury fee per 9 claims
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Feature Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: AI Suggestion Engine Rules & Liquidity Colors */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <Cpu className="h-5 w-5 text-[#38BDF8]" />
                AI Suggestion Engine & Rules Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="rounded-2xl border border-[#4F8AFF]/25 bg-[#4F8AFF]/10 p-4 space-y-2 backdrop-blur-md">
                <span className="font-bold text-[#F8FAFC] block text-sm">4 Core Optimization Directives:</span>
                <ul className="space-y-2 text-[#94A3B8]">
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-[#4F8AFF] px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5 shadow-sm">
                      P1
                    </span>
                    <span>
                      <strong className="text-[#F8FAFC]">Exact Match with Fewest Transfers:</strong> Groups worker requests into
                      cards matching the advertiser&apos;s requested amount.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-[#4F8AFF] px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5 shadow-sm">
                      P2
                    </span>
                    <span>
                      <strong className="text-[#F8FAFC]">Preserve Large Bills (&ge;$50):</strong> Never breaks $50+ bills for small
                      deposit requests (&lt;$50) if smaller combinations exist.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-[#4F8AFF] px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5 shadow-sm">
                      P3
                    </span>
                    <span>
                      <strong className="text-[#F8FAFC]">Liquidity Floor:</strong> Retains at least 1x$50 and 1x$40 in the open pool
                      for high-volume advertisers.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="rounded bg-[#4F8AFF] px-1.5 py-0.2 text-[9px] font-bold text-white mt-0.5 shadow-sm">
                      P4
                    </span>
                    <span>
                      <strong className="text-[#F8FAFC]">FIFO Order:</strong> Oldest requests within the same denomination are
                      cleared first.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Color Tag Bar */}
              <div>
                <span className="font-bold text-[#F8FAFC] block mb-2">Denomination Color Coding:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 backdrop-blur-md">
                    <span className="text-[10px] font-bold uppercase text-emerald-300">Green</span>
                    <p className="font-bold font-mono text-emerald-200 text-sm">$10 Bills</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 backdrop-blur-md">
                    <span className="text-[10px] font-bold uppercase text-blue-300">Blue</span>
                    <p className="font-bold font-mono text-blue-200 text-sm">$20 Bills</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 backdrop-blur-md">
                    <span className="text-[10px] font-bold uppercase text-amber-300">Orange</span>
                    <p className="font-bold font-mono text-amber-200 text-sm">$30 - $40 Bills</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 backdrop-blur-md">
                    <span className="text-[10px] font-bold uppercase text-rose-300">Red</span>
                    <p className="font-bold font-mono text-rose-200 text-sm">$50+ Big Bills</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Action Hub */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-base font-bold text-[#F8FAFC]">
                Quick Navigation Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Link href="/wallet" className="block">
                <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] p-3.5 hover:border-emerald-400/50 hover:bg-emerald-500/10 transition backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F8FAFC]">Worker Wallet</h4>
                      <p className="text-[11px] text-[#94A3B8]">Request cashout & join liquidity pool</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                </div>
              </Link>

              <Link href="/deposit/request" className="block">
                <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] p-3.5 hover:border-[#4F8AFF]/50 hover:bg-[#4F8AFF]/10 transition backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8AFF]/20 text-[#38BDF8] border border-[#4F8AFF]/30">
                      <ArrowDownToLine className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F8FAFC]">Advertiser Deposit Request</h4>
                      <p className="text-[11px] text-[#94A3B8]">Request amount & get AI suggestions</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                </div>
              </Link>

              <Link href="/admin/batches" className="block">
                <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] p-3.5 hover:border-rose-400/50 hover:bg-rose-500/10 transition backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <CheckSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F8FAFC]">Admin Batches Approval</h4>
                      <p className="text-[11px] text-[#94A3B8]">Review combinations & issue cards</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                </div>
              </Link>

              <Link href="/admin/pool" className="block">
                <div className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/[0.04] p-3.5 hover:border-[#4F8AFF]/50 hover:bg-[#4F8AFF]/10 transition backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8AFF]/20 text-[#38BDF8] border border-[#4F8AFF]/30">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F8FAFC]">Liquidity Pool Colors</h4>
                      <p className="text-[11px] text-[#94A3B8]">Monitor Green/Blue/Orange/Red bills</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
