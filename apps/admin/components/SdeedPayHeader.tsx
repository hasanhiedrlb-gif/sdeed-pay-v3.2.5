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
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: Wallet,
    },
    advertiser: {
      label: 'Advertiser',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Building2,
    },
    admin: {
      label: 'Bank Admin',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: ShieldCheck,
    },
    platform: {
      label: 'Platform Treasury',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Layers,
    },
  };

  const currentBadge = currentUser
    ? roleBadges[currentUser.role] || roleBadges.worker
    : roleBadges.worker;
  const CurrentIcon = currentBadge.icon;

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur-md">
      {/* Left: App Title & Security Tag */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-slate-900">sdeedpay</span>
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-800">
              v1.1.0 Smart Bank
            </span>
          </div>
          <p className="text-xs text-slate-500">Kamekaz Shared Ledger • 10 Point = $1.00 USD</p>
        </div>
      </div>

      {/* Right: Active Kamekaz Identity & Fast Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Reset Mock Seed button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          title="Reset database to initial seed"
          className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Resetting...' : 'Reset Demo'}</span>
        </button>

        {/* Kamekaz Active User Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-left hover:bg-slate-100/80 transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700">
              <CurrentIcon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800">
                  {currentUser?.name || 'Select User'}
                </span>
                <span
                  className={`rounded border px-1.5 py-0.2 text-[10px] font-semibold ${currentBadge.bg}`}
                >
                  {currentBadge.label}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-500">
                {currentUser?.id} • <strong className="text-slate-900">{Number(currentUser?.points_balance || 0).toLocaleString()}</strong> pts{' '}
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
              <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="mb-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Kamekaz Test Identity
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
                        className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-900 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium leading-none">{u.name}</p>
                            <p className="font-mono text-[10px] text-slate-400">{u.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block rounded border px-1 py-0.5 text-[9px] font-bold ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          <p className="font-mono text-[11px] font-bold text-slate-900">
                            {Number(u.points_balance).toLocaleString()} pts
                          </p>
                          <p className="font-mono text-[10px] text-slate-400">
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
