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
      title: 'Worker Portal',
      description: 'Courier & Driver Payouts',
      items: [
        {
          label: 'My Wallet & Withdraw',
          href: '/wallet',
          icon: Wallet,
          badge: isWorker ? 'Active Role' : undefined,
          badgeColor: 'bg-emerald-100 text-emerald-800',
        },
        {
          label: 'P2P Transfer & QR',
          href: '/transfer',
          icon: Send,
          badge: 'v1.2.0',
          badgeColor: 'bg-indigo-100 text-indigo-800',
        },
      ],
    },
    {
      title: 'Advertiser Portal',
      description: 'Account Funding & Campaigns',
      items: [
        {
          label: 'Deposit Request',
          href: '/deposit/request',
          icon: ArrowDownToLine,
          badge: isAdvertiser ? 'Active Role' : undefined,
          badgeColor: 'bg-indigo-100 text-indigo-800',
        },
      ],
    },
    {
      title: 'Bank Administration',
      description: 'AI Optimizer & Liquidity Pool',
      items: [
        {
          label: 'Deposit Batches',
          href: '/admin/batches',
          icon: CheckSquare,
          highlight: true,
        },
        {
          label: 'Liquidity Pool (Colors)',
          href: '/admin/pool',
          icon: Layers,
        },
      ],
    },
    {
      title: 'System & Overview',
      description: 'Bank Audits',
      items: [
        {
          label: 'Bank Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
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
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">sdeedpay</h2>
          <p className="text-[11px] text-slate-400 font-medium">Smart Payments Bank</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="mb-2 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${item.badgeColor || 'bg-slate-100 text-slate-800'}`}
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
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg bg-slate-800/80 p-3 border border-slate-700/60">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-semibold text-slate-200">AI Engine Online</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Liquidity preservation heuristic active. Auto 1:9 commission routing enabled.
          </p>
        </div>
      </div>
    </aside>
  );
}
