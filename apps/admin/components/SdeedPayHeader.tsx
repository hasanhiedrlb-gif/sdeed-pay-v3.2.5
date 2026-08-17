'use client';

import React, { useState } from 'react';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi } from '@/lib/sdeedpay-api';
import {
  Wallet,
  Building2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  User,
  Layers,
} from 'lucide-react';

export default function SdeedPayHeader() {
  const { currentUser, users, setCurrentUser, refreshUsers } = useUser();
  const [resetting, setResetting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function handleReset() {
    if (confirm('Reset sdeedpay state to initial pool & seed batches?')) {
      setResetting(true);
      try {
        await sdeedpayApi.resetState();
        await refreshUsers();
      } finally {
        setResetting(false);
      }
    }
  }

  const roleBadges = {
    worker: {
      label: 'Worker / Courier',
      bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: Wallet,
    },
    advertiser: {
      label: 'Advertiser / Merchant',
      bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      icon: Building2,
    },
    admin: {
      label: 'Bank Admin',
      bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      icon: ShieldCheck,
    },
    platform: {
      label: 'Platform Treasury',
      bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: Layers,
    },
  };

  const currentBadge = currentUser
    ? roleBadges[currentUser.role] || roleBadges.worker
    : roleBadges.worker;
  const CurrentIcon = currentBadge.icon;

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-blue-500/20 bg-slate-950/85 px-6 py-3 backdrop-blur-xl text-white shadow-md">
      {/* Left: App Title & Security Tag */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 font-bold text-white shadow-lg shadow-blue-500/20 border border-white/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black tracking-tight text-white font-mono">sdeedpay Panel</span>
            <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
              Glass Blue Theme
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans">Kamekaz KYC Integration (C1 Cap $500 • C2 Unlimited) • Zero-Identity</p>
        </div>
      </div>

      {/* Right: Active Kamekaz Identity & Fast Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Reset Mock Seed button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          title="Reset database to initial seed"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition backdrop-blur-sm"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
        </button>

        {/* Kamekaz Active User Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-left hover:bg-white/10 transition backdrop-blur-md"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <CurrentIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {currentUser?.name || 'Select User'}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${currentBadge.bg}`}
                >
                  {currentBadge.label}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">
                {currentUser?.id} • <strong className="text-emerald-400">{Number(currentUser?.points_balance || 0).toLocaleString()}</strong> pts{' '}
                <span className="text-slate-400">(${(Number(currentUser?.points_balance || 0) / 10).toFixed(2)})</span>
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1.5 w-76 rounded-2xl border border-white/20 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-2xl">
                <div className="mb-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-1.5">
                  Switch Active Identity
                </div>
                <div className="space-y-1">
                  {users.map((u) => {
                    const isSelected = currentUser?.id === u.id;
                    const badge = roleBadges[u.role] || roleBadges.worker;
                    const Icon = badge.icon;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setCurrentUser(u);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left text-xs transition ${
                          isSelected
                            ? 'bg-blue-600/30 text-white font-medium border border-blue-500/40'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="font-bold leading-none text-white">{u.name}</p>
                            <p className="font-mono text-[10px] text-slate-400">{u.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block rounded border px-1 py-0.5 text-[8px] font-bold uppercase ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <p className="font-mono text-[11px] font-black text-emerald-400">
                            {Number(u.points_balance).toLocaleString()} pts
                          </p>
                          <p className="font-mono text-[9px] text-slate-400">
                            ${(u.points_balance / 10).toFixed(2)} USD
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
