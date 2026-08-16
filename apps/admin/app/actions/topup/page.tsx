'use client';

import { useState } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { formatLBP } from '@/lib/format';

export default function TopupPage() {
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.topup(userId, parseFloat(amount), description || undefined);
      setResult(res);
      setAmount('');
      setDescription('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Top up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <h1 className="mb-6 text-2xl font-bold">Top Up Wallet</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>New Top Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">User ID</label>
              <Input value={userId} onChange={(e) => setUserId(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Amount (LBP)</label>
              <Input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {result && (
              <p className="text-sm text-green-600">
                Success. New balance: {formatLBP(result.wallet.balance)}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processing...' : 'Top Up'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
