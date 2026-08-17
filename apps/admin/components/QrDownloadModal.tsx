'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Download,
  Copy,
  Check,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  DollarSign,
  FileText,
  RefreshCw,
  Layers,
  Timer,
  Clock,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SpUser } from '@/lib/sdeedpay-types';
import { sdeedpayApi, SDEED_API_URL } from '@/lib/sdeedpay-api';

interface QrDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SpUser | null;
}

const QR_EXPIRATION_SECONDS = 15 * 60; // 15 minutes in seconds

export function QrDownloadModal({ isOpen, onClose, user }: QrDownloadModalProps) {
  const [qrData, setQrData] = useState<{
    user_id: string;
    app: string;
    name: string;
    phone: string | null;
    kyc_status: string;
    qr_image_url: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customMemo, setCustomMemo] = useState<string>('');
  const [downloadFormat, setDownloadFormat] = useState<'branded_card' | 'raw_qr'>('branded_card');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Security & 15-minute Expiration Timer State
  const [timeLeft, setTimeLeft] = useState<number>(QR_EXPIRATION_SECONDS);
  const [sessionNonce, setSessionNonce] = useState<string>(() => Math.random().toString(36).substring(2, 9));
  const [issuedAt, setIssuedAt] = useState<number>(() => Date.now());
  const [isRefreshedToast, setIsRefreshedToast] = useState(false);
  const [refreshReason, setRefreshReason] = useState<'expired' | 'manual'>('manual');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch verified QR payload from API endpoint: /api/v1/qr/:user_id
  const loadQrFromApi = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await sdeedpayApi.getQrPayload(user.id);
      setQrData(data);
    } catch (err) {
      console.error('Failed to load QR code payload from /api/v1/qr/:user_id:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manual or automatic refresh of security token & timer
  const handleRefreshPayload = (reason: 'expired' | 'manual' = 'manual') => {
    setSessionNonce(Math.random().toString(36).substring(2, 9));
    const now = Date.now();
    setIssuedAt(now);
    setTimeLeft(QR_EXPIRATION_SECONDS);
    setRefreshReason(reason);
    loadQrFromApi();
    setIsRefreshedToast(true);
    setTimeout(() => setIsRefreshedToast(false), 3500);
  };

  useEffect(() => {
    if (isOpen && user) {
      setSessionNonce(Math.random().toString(36).substring(2, 9));
      setIssuedAt(Date.now());
      setTimeLeft(QR_EXPIRATION_SECONDS);
      loadQrFromApi();
      setCustomAmount('');
      setCustomMemo('');
      setDownloadSuccess(false);
      setIsRefreshedToast(false);
    }
  }, [isOpen, user]);

  // 1-second countdown ticker for 15-minute expiration
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Trigger payload refresh upon expiry when timeLeft reaches 0
  useEffect(() => {
    if (timeLeft === 0 && isOpen) {
      handleRefreshPayload('expired');
    }
  }, [timeLeft, isOpen]);

  const expiresAt = issuedAt + QR_EXPIRATION_SECONDS * 1000;
  const progressPercent = Math.max(0, Math.min(100, (timeLeft / QR_EXPIRATION_SECONDS) * 100));

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Construct active payload string based on standard user info + 15-min security nonce + optional custom amount/memo
  const activePayloadObject = {
    user_id: user?.id || 'usr_kamekaz_anonymous',
    app: 'sdeedpay',
    token_nonce: sessionNonce,
    issued_at: new Date(issuedAt).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
    ...(customAmount && Number(customAmount) > 0 ? { amount: Number(customAmount) } : {}),
    ...(customMemo.trim() ? { memo: customMemo.trim() } : {}),
  };

  const payloadString = JSON.stringify(activePayloadObject, null, 2);
  const encodedPayload = encodeURIComponent(JSON.stringify(activePayloadObject));
  const activeQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodedPayload}`;

  // Copy JSON payload string
  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(activePayloadObject));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Generate and Download custom QR Image (Branded Payment Card or Clean Raw QR)
  const handleDownloadQr = async () => {
    if (!user) return;
    setIsDownloading(true);

    try {
      // Pre-load QR code image from generator
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = (e) => reject(e);
        qrImg.src = activeQrImageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const scale = 2; // High-res 2x retina export

      if (downloadFormat === 'raw_qr') {
        // RAW QR CODE PNG EXPORT (800x800)
        canvas.width = 400 * scale;
        canvas.height = 400 * scale;
        ctx.scale(scale, scale);

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 400);

        // Draw QR
        ctx.drawImage(qrImg, 20, 20, 360, 360);

        // Trigger download
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = `sdeedpay-qr-${user.id}${customAmount ? `-${customAmount}usd` : ''}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // OFFICIAL SDEEDPAY BRANDED PAYMENT CARD (600x820 @ 2x)
        const w = 440;
        const h = 620;
        canvas.width = w * scale;
        canvas.height = h * scale;
        ctx.scale(scale, scale);

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Header Background Gradient
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#312e81');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, 100);

        // Brand Accent Line
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, 98, w, 2);

        // Brand Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('SDEEDPAY', 24, 38);

        ctx.fillStyle = '#a5b4fc';
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('Smart Payments Bank & P2P Network', 24, 58);

        // Verified Shield Badge
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(w - 38, 48, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', w - 38, 52);
        ctx.textAlign = 'left';

        // QR Frame Container
        const qrSize = 250;
        const qrX = (w - qrSize) / 2;
        const qrY = 120;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16);
        } else {
          ctx.rect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        }
        ctx.fill();
        ctx.stroke();

        // Draw QR Image
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Custom Amount Pill if preset
        let currentY = qrY + qrSize + 24;
        if (customAmount && Number(customAmount) > 0) {
          ctx.fillStyle = '#eef2ff';
          ctx.strokeStyle = '#c7d2fe';
          ctx.lineWidth = 1;
          const pillW = 200;
          const pillX = (w - pillW) / 2;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(pillX, currentY, pillW, 32, 16);
          } else {
            ctx.rect(pillX, currentY, pillW, 32);
          }
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#4338ca';
          ctx.font = 'bold 13px ui-sans-serif, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Requesting: $${Number(customAmount).toFixed(2)} USD`, w / 2, currentY + 20);
          ctx.textAlign = 'left';
          currentY += 42;
        }

        // Details Container Box
        const boxX = 24;
        const boxW = w - 48;
        const boxH = 126;
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, currentY, boxW, boxH, 12);
        } else {
          ctx.rect(boxX, currentY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        // Details Text
        ctx.fillStyle = '#64748b';
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('Recipient Name:', boxX + 14, currentY + 24);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(user.name, boxX + 130, currentY + 24);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('User ID:', boxX + 14, currentY + 46);
        ctx.fillStyle = '#4f46e5';
        ctx.font = 'bold 11px ui-sans-serif, system-ui, monospace';
        ctx.fillText(user.id, boxX + 130, currentY + 46);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('Phone / Wallet:', boxX + 14, currentY + 68);
        ctx.fillStyle = '#0f172a';
        ctx.font = '11px ui-sans-serif, system-ui, monospace';
        ctx.fillText(user.phone || 'N/A', boxX + 130, currentY + 68);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('App Identifier:', boxX + 14, currentY + 90);
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 11px ui-sans-serif, system-ui, monospace';
        ctx.fillText('sdeedpay (p2p)', boxX + 130, currentY + 90);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('Security Token:', boxX + 14, currentY + 112);
        ctx.fillStyle = '#4f46e5';
        ctx.font = 'bold 10px ui-sans-serif, system-ui, monospace';
        ctx.fillText(`15-min dynamic (exp: ${new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`, boxX + 130, currentY + 112);

        // Footer note
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Scan with SdeedPay or Kamekaz app to transfer points immediately.', w / 2, h - 14);
        ctx.textAlign = 'left';

        // Trigger download
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.download = `sdeedpay-payment-card-${user.id}.png`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to generate and download QR image:', err);
      alert('Error generating QR image: ' + (err?.message || 'Unknown'));
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/40 text-indigo-300 border border-indigo-500/40">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Generate & Download SdeedPay QR Code
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/30">
                  GET /api/v1/qr/:user_id
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Official payment QR code with embedded user_id and app info
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Automatic Expiry Refresh / Manual Refresh Toast Banner */}
          {isRefreshedToast && (
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs text-indigo-900 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                  {refreshReason === 'expired'
                    ? 'QR Payload expired (15m limit reached) — automatically generated fresh token & restarted timer!'
                    : 'QR Security Payload manually refreshed! New 15-minute token generated.'}
                </span>
              </div>
              <span className="font-mono text-[10px] bg-indigo-200/70 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                Nonce #{sessionNonce}
              </span>
            </div>
          )}

          {/* Download Success Flash Banner */}
          {downloadSuccess && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-medium">
                QR Code downloaded successfully! Ready to print, share, or embed.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left: Live QR Preview Card */}
            <div className="md:col-span-6 flex flex-col items-center justify-center p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
              <div className="relative p-3 bg-white rounded-2xl border-2 border-indigo-100 shadow-md flex items-center justify-center w-56 h-56">
                {loading ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                    <span>Loading QR from API...</span>
                  </div>
                ) : (
                  <img
                    src={activeQrImageUrl}
                    alt="SdeedPay QR Code Preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                )}

                {/* Floating SdeedPay badge */}
                <div className="absolute -bottom-2.5 bg-slate-900 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/50 shadow-sm flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  sdeedpay-p2p
                </div>
              </div>

              {/* User Metadata Overview */}
              <div className="w-full text-center space-y-0.5 pt-1">
                <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                <div className="text-[11px] font-mono text-indigo-600">{user?.id}</div>
                <div className="text-[10px] text-slate-500">{user?.phone}</div>
              </div>

              {/* Visual 15-Minute Expiration Timer & Countdown Progress Bar */}
              <div className="w-full rounded-xl bg-white border border-slate-200 p-3 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Timer
                      className={`h-4 w-4 ${
                        timeLeft <= 60
                          ? 'text-rose-600 animate-pulse'
                          : timeLeft <= 300
                          ? 'text-amber-500'
                          : 'text-indigo-600'
                      }`}
                    />
                    <div>
                      <span className="text-[11px] font-bold block leading-tight">15-Min Expiration Timer</span>
                      <span className="text-[9px] text-slate-400">Auto-refreshes payload upon expiry</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono text-xs font-black px-2 py-0.5 rounded shadow-2xs ${
                        timeLeft <= 60
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                          : timeLeft <= 300
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {formatCountdown(timeLeft)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRefreshPayload('manual')}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition"
                      title="Force refresh payload & restart 15-minute countdown"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Visual Countdown Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/80 p-0.5">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                        timeLeft <= 60
                          ? 'bg-rose-500 shadow-sm shadow-rose-400 animate-pulse'
                          : timeLeft <= 300
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{Math.round(progressPercent)}% time remaining</span>
                    <span>
                      Exp: {new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-emerald-600" />
                    <span>Dynamic token valid 15m</span>
                  </span>
                  <span className="font-mono text-[9px] text-slate-400">Nonce: #{sessionNonce}</span>
                </div>
              </div>
            </div>

            {/* Right: Customization & Specifications */}
            <div className="md:col-span-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Export Design Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadFormat('branded_card')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      downloadFormat === 'branded_card'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Layers className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Branded Card</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-1">
                      Full PNG card with logo, user ID, and badge
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDownloadFormat('raw_qr')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      downloadFormat === 'raw_qr'
                        ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Clean QR Code</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal mt-1">
                      Pure high-res QR square for digital embedding
                    </span>
                  </button>
                </div>
              </div>

              {/* Optional Preset Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Optional Preset Amount ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Leave empty for open amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-8 text-xs font-mono h-8.5"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  If set, scanning this QR will automatically pre-fill the transfer amount.
                </span>
              </div>

              {/* Optional Memo */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Optional Note / Memo
                </label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="e.g. Invoice #204 or Delivery fee"
                    value={customMemo}
                    onChange={(e) => setCustomMemo(e.target.value)}
                    className="pl-8 text-xs h-8.5"
                  />
                </div>
              </div>

              {/* Live JSON Payload Inspector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Embedded Payload (JSON)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-lg bg-slate-900 p-2.5 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-24">
                  {payloadString}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Endpoint: /api/v1/qr/{user?.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isDownloading || loading || !user}
              onClick={handleDownloadQr}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 px-4"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Generating PNG...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Download QR Code (PNG)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
