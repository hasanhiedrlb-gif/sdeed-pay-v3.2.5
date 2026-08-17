'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Wallet, Sparkles, ShieldCheck } from 'lucide-react';
import { CountUp } from '@/components/CountUp';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWallets().then(setWallets).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => wallets.filter((w) => w.userId.toLowerCase().includes(search.toLowerCase())),
    [wallets, search],
  );

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
              <Wallet className="h-6 w-6 text-[#38BDF8]" />
              Sadeed Pay Wallets & Ledger
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Direct connection to DB <code className="text-[#38BDF8] font-mono">wallets</code> table. KYC Tiers fetched from Kamekaz.
            </p>
          </div>

          <Link href="/merchant">
            <Button className="font-bold text-xs h-10">
              <Sparkles className="h-4 w-4 mr-1.5" />
              Open Glass Merchant Control
            </Button>
          </Link>
        </div>

        <div className="max-w-sm">
          <Input
            placeholder="Search by userId..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
          />
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-center text-xs text-[#94A3B8]">Loading wallets from database...</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>User ID</TH>
                    <TH>KYC Tier (Kamekaz)</TH>
                    <TH>Balance</TH>
                    <TH>Currency</TH>
                    <TH>Created</TH>
                    <TH className="text-right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {filtered.map((w) => (
                    <TR key={w.id} className="hover:bg-white/[0.06] transition">
                      <TD className="font-mono font-semibold text-[#F8FAFC]">{w.userId}</TD>
                      <TD>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                            w.tier === 'C2' || w.tier === 'C3'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : w.tier === 'C1'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          Tier {w.tier || 'C1'}
                          {w.tier === 'C2' || w.tier === 'C3' ? ' (Unlimited)' : ' (Cap $500)'}
                        </span>
                      </TD>
                      <TD className="font-mono font-black text-emerald-400 text-sm">
                        <CountUp value={parseFloat(w.balance)} prefix="$" duration={1200} />
                      </TD>
                      <TD className="text-[#94A3B8] font-semibold">{w.currency || 'USD'}</TD>
                      <TD className="text-xs text-[#94A3B8]">{formatDate(w.createdAt)}</TD>
                      <TD className="text-right">
                        <Link href={`/wallets/${w.userId}`}>
                          <Button size="sm" variant="outline" className="text-xs h-7">
                            View Ledger
                          </Button>
                        </Link>
                      </TD>
                    </TR>
                  ))}
                  {filtered.length === 0 && (
                    <TR>
                      <TD colSpan={6} className="p-8 text-center text-[#94A3B8] text-xs">
                        No wallets found matching search criteria.
                      </TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
