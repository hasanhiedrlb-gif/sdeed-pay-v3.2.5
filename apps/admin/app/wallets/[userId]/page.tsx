'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatLBP, formatDate } from '@/lib/format';

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
      <h1 className="mb-1 text-2xl font-bold">Wallet Ledger</h1>
      <p className="mb-6 font-mono text-sm text-slate-500">{userId}</p>

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <>
          <Card className="mb-6 max-w-xs">
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-3xl font-bold ${
                  parseFloat(wallet?.balance ?? '0') < 0 ? 'text-red-600' : ''
                }`}
              >
                {formatLBP(wallet?.balance ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Type</TH>
                    <TH>From</TH>
                    <TH>To</TH>
                    <TH>Amount</TH>
                    <TH>Source</TH>
                    <TH>Status</TH>
                  </TR>
                </THead>
                <TBody>
                  {transactions.map((t) => {
                    const isOutgoing = t.fromUserId === userId;
                    return (
                      <TR key={t.id}>
                        <TD>{formatDate(t.createdAt)}</TD>
                        <TD>{t.type}</TD>
                        <TD className="font-mono">{t.fromUserId}</TD>
                        <TD className="font-mono">{t.toUserId}</TD>
                        <TD className={isOutgoing ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                          {isOutgoing ? '-' : '+'}
                          {formatLBP(t.amount)}
                        </TD>
                        <TD>{t.appSource}</TD>
                        <TD>
                          <Badge variant={t.status === 'DONE' ? 'success' : t.status === 'FAILED' ? 'danger' : 'warning'}>
                            {t.status}
                          </Badge>
                        </TD>
                      </TR>
                    );
                  })}
                  {transactions.length === 0 && (
                    <TR>
                      <TD colSpan={7} className="p-4 text-center text-slate-400">
                        No transactions yet.
                      </TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </AuthGuard>
  );
}
