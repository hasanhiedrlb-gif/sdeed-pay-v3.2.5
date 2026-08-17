'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import {
  Wallet,
  ArrowDownToLine,
  CheckSquare,
  Layers,
  LayoutDashboard,
  ReceiptText,
  Sparkles,
  Send,
  ShieldCheck,
  Building,
  CreditCard,
  LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  arabicTitle: string;
  description: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser } = useUser();

  const isWorker = currentUser?.role === 'worker';
  const isAdvertiser = currentUser?.role === 'advertiser';

  const navSections: NavSection[] = [
    {
      title: 'WORKER PORTAL',
      arabicTitle: 'بوابة العمال والسائقين',
      description: 'Earnings, Payouts & QR Transfers',
      items: [
        {
          label: 'My Wallet & Withdraw',
          href: '/wallet',
          icon: Wallet,
          badge: isWorker ? 'Active' : undefined,
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        },
        {
          label: 'P2P Transfer & QR Pay',
          href: '/transfer',
          icon: Send,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        },
      ],
    },
    {
      title: 'ADVERTISER PORTAL',
      arabicTitle: 'بوابة المعلنين والتجار',
      description: 'Sadeed Pay Glass Panel & Checkout',
      items: [
        {
          label: 'Sadeed Pay (Glass Panel)',
          href: '/merchant',
          icon: Sparkles,
          badge: 'Sadeed API',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold',
          highlight: true,
        },
        {
          label: 'Deposit Request',
          href: '/deposit/request',
          icon: ArrowDownToLine,
          badge: isAdvertiser ? 'Active' : undefined,
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
        },
      ],
    },
    {
      title: 'BANK ADMINISTRATION',
      arabicTitle: 'إدارة البنك والسيولة',
      description: 'Wallets, Batches & Liquidity Pool',
      items: [
        {
          label: 'Bank Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          label: 'Wallets & KYC Ledger',
          href: '/wallets',
          icon: CreditCard,
          badge: 'Kamekaz Sync',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        },
        {
          label: 'Deposit Batches (1:9)',
          href: '/admin/batches',
          icon: CheckSquare,
          highlight: true,
        },
        {
          label: 'Liquidity Pool (Colors)',
          href: '/admin/pool',
          icon: Layers,
        },
        {
          label: 'Transaction Ledger',
          href: '/transactions',
          icon: ReceiptText,
        },
      ],
    },
  ];

  return (
    <aside className="relative flex w-64 flex-col border-r border-blue-500/20 bg-gradient-to-b from-slate-950 via-slate-900/95 to-blue-950/80 text-slate-200 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Subtle glowing ambient blue accent */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Brand Header */}
      <div className="relative z-10 flex items-center gap-3 border-b border-blue-500/20 p-5 backdrop-blur-md bg-white/[0.02]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 border border-white/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
            sdeedpay
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Panel
            </span>
          </h2>
          <p className="text-[11px] text-blue-300/80 font-medium">Glass Theme • Zero-Identity</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="relative z-10 flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <div className="px-3 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400/90 font-mono">
                {section.title}
              </span>
            </div>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/80 text-white font-bold shadow-lg shadow-blue-600/30 border border-white/25 backdrop-blur-md'
                        : item.highlight
                        ? 'text-cyan-200 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 backdrop-blur-sm'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white hover:border-white/10 border border-transparent backdrop-blur-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                          isActive
                            ? 'text-white'
                            : item.highlight
                            ? 'text-cyan-400'
                            : 'text-slate-400 group-hover:text-blue-300'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-wide ${
                          item.badgeColor || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Status Card */}
      <div className="relative z-10 border-t border-blue-500/20 p-4 bg-white/[0.02] backdrop-blur-md">
        <div className="rounded-xl bg-gradient-to-br from-blue-950/60 to-slate-900/80 p-3 border border-blue-500/25 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-bold text-white font-mono">Kamekaz KYC Live</span>
            </div>
            <span className="text-[9px] font-bold text-cyan-300 font-mono">C1/C2 Engine</span>
          </div>
          <p className="text-[10px] text-blue-200/70 leading-relaxed font-sans">
            Zero identity stored. Real-time verification on <code className="text-cyan-300 font-mono">/kyc/status</code>.
          </p>
        </div>
      </div>
    </aside>
  );
}
