'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Wallet, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { CountUp } from '@/components/CountUp';

export default function WalletDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = decodeURIComponent(params.userId);

  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getWallet(userId), api.getTransactions({ userId })])
      .then(([w, t]) => {
        setWallet(w);
        setTransactions(t);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/wallets">
              <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#F8FAFC] flex items-center gap-2">
                <Wallet className="h-6 w-6 text-[#38BDF8]" />
                Wallet Ledger
              </h1>
              <p className="font-mono text-xs text-[#94A3B8]">{userId}</p>
            </div>
          </div>

          <Link href="/merchant">
            <Button size="sm" className="font-bold text-xs h-9">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Merchant Glass Simulator
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-[#94A3B8] text-xs">Loading ledger...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase text-[#94A3B8]">Current Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black font-mono text-emerald-400">
                    <CountUp
                      value={parseFloat(wallet?.balance ?? '0')}
                      prefix="$"
                      duration={1200}
                    />
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1 font-mono">Currency: {wallet?.currency || 'USD'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase text-[#94A3B8]">Kamekaz KYC Tier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-sm font-black font-mono ${
                        wallet?.tier === 'C2' || wallet?.tier === 'C3'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : wallet?.tier === 'C1'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      TIER {wallet?.tier || 'C1'}
                    </span>
                    <span className="text-xs text-[#F8FAFC] font-semibold">
                      {wallet?.tier === 'C2' || wallet?.tier === 'C3'
                        ? 'Unlimited & Pay Enabled'
                        : wallet?.tier === 'C1'
                        ? 'Cap $500 Topup'
                        : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1">Queried live from Kamekaz KYC service</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase text-[#94A3B8]">Wallet Record ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-xs font-bold text-[#38BDF8] bg-white/[0.06] border border-white/10 p-2 rounded-xl break-all">
                    {wallet?.id || 'N/A'}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">Primary key in DB table `wallets`</p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="text-base font-bold text-[#F8FAFC]">
                  Transaction Audit History ({transactions.length} Records)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Date</TH>
                      <TH>Type</TH>
                      <TH>Reference</TH>
                      <TH>From</TH>
                      <TH>To</TH>
                      <TH>Amount</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {transactions.map((t) => {
                      const isOutgoing = t.fromUserId === userId;
                      return (
                        <TR key={t.id} className="hover:bg-white/[0.06] transition">
                          <TD className="text-xs text-[#94A3B8]">{formatDate(t.createdAt)}</TD>
                          <TD>
                            <span className="rounded-lg bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase font-mono text-[#F8FAFC]">
                              {t.type}
                            </span>
                          </TD>
                          <TD className="font-mono text-xs text-[#F8FAFC] font-semibold">{t.referenceId}</TD>
                          <TD className="font-mono text-xs text-[#94A3B8]">{t.fromUserId}</TD>
                          <TD className="font-mono text-xs text-[#94A3B8]">{t.toUserId}</TD>
                          <TD
                            className={`font-mono font-bold text-xs ${
                              isOutgoing ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {isOutgoing ? '-' : '+'}${parseFloat(t.amount).toFixed(2)}
                          </TD>
                          <TD>
                            <Badge
                              variant={
                                t.status === 'DONE'
                                  ? 'success'
                                  : t.status === 'FAILED'
                                  ? 'danger'
                                  : 'warning'
                              }
                              className="text-[10px] font-bold"
                            >
                              {t.status}
                            </Badge>
                          </TD>
                        </TR>
                      );
                    })}
                    {transactions.length === 0 && (
                      <TR>
                        <TD colSpan={7} className="p-6 text-center text-[#94A3B8] text-xs">
                          No transactions recorded for this wallet yet.
                        </TD>
                      </TR>
                    )}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
