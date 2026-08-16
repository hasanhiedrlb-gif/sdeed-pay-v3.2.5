'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatLBP, formatDate } from '@/lib/format';

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
      <h1 className="mb-6 text-2xl font-bold">Wallets</h1>
      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Search by userId..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-slate-400">Loading...</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>User ID</TH>
                  <TH>Balance</TH>
                  <TH>Currency</TH>
                  <TH>Created</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((w) => (
                  <TR key={w.id}>
                    <TD className="font-mono">{w.userId}</TD>
                    <TD className={parseFloat(w.balance) < 0 ? 'text-red-600 font-semibold' : ''}>
                      {formatLBP(w.balance)}
                    </TD>
                    <TD>{w.currency}</TD>
                    <TD>{formatDate(w.createdAt)}</TD>
                    <TD>
                      <Link href={`/wallets/${w.userId}`}>
                        <Button variant="outline">View Ledger</Button>
                      </Link>
                    </TD>
                  </TR>
                ))}
                {filtered.length === 0 && (
                  <TR>
                    <TD colSpan={5} className="p-4 text-center text-slate-400">
                      No wallets found.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
