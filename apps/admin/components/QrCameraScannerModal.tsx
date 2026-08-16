'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  RefreshCw,
  Upload,
  AlertCircle,
  CheckCircle2,
  Flashlight,
  SwitchCamera,
  Sparkles,
  ShieldCheck,
  QrCode,
  Smartphone,
  ExternalLink,
  History,
  Trash2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SpUser } from '@/lib/sdeedpay-types';

export interface ParsedQrPayload {
  raw: string;
  userId: string;
  method: 'qr' | 'phone';
  app?: string;
  amount?: number;
  name?: string;
  note?: string;
}

export interface RecentScanItem {
  userId: string;
  name?: string;
  phone?: string;
  method: 'qr' | 'phone';
  timestamp: number;
  amount?: number;
}

const RECENT_SCANS_KEY = 'sdeedpay_recent_scans_v1';
const MAX_RECENT_SCANS = 5;

export function parseSdeedPayPayload(raw: string): ParsedQrPayload | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();

  // 1. JSON parse (standard SdeedPay QR format: { "user_id": "...", "app": "sdeedpay" })
  try {
    const json = JSON.parse(trimmed);
    if (json && typeof json === 'object') {
      const userId =
        json.user_id ||
        json.userId ||
        json.id ||
        json.recipient ||
        json.user ||
        json.recipient_id;
      const phone = json.phone || json.phone_number || json.mobile;
      const amount = json.amount ? Number(json.amount) : undefined;
      const app = json.app || 'sdeedpay';
      const name = json.name || json.holder_name;
      const note = json.note || json.memo;

      if (userId && typeof userId === 'string') {
        return {
          raw: trimmed,
          userId: userId.trim(),
          method: 'qr',
          app,
          amount,
          name,
          note,
        };
      }

      if (phone && typeof phone === 'string') {
        return {
          raw: trimmed,
          userId: phone.trim(),
          method: 'phone',
          app,
          amount,
          name,
          note,
        };
      }
    }
  } catch (e) {
    // Not JSON, continue to URL/text parsing
  }

  // 2. URL or URI parsing (sdeedpay://transfer?user_id=... or https://.../transfer?user_id=...)
  if (
    trimmed.startsWith('sdeedpay://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    try {
      const urlStr = trimmed.startsWith('sdeedpay://')
        ? trimmed.replace('sdeedpay://', 'https://sdeedpay.app/')
        : trimmed;
      const parsedUrl = new URL(urlStr);
      const userId =
        parsedUrl.searchParams.get('user_id') ||
        parsedUrl.searchParams.get('userId') ||
        parsedUrl.searchParams.get('user') ||
        parsedUrl.searchParams.get('recipient') ||
        parsedUrl.searchParams.get('to');
      const phone = parsedUrl.searchParams.get('phone');
      const amountStr = parsedUrl.searchParams.get('amount');
      const amount = amountStr ? Number(amountStr) : undefined;
      const note = parsedUrl.searchParams.get('note') || parsedUrl.searchParams.get('memo') || undefined;

      if (userId) {
        return {
          raw: trimmed,
          userId: userId.trim(),
          method: 'qr',
          app: 'sdeedpay',
          amount,
          note,
        };
      }
      if (phone) {
        return {
          raw: trimmed,
          userId: phone.trim(),
          method: 'phone',
          app: 'sdeedpay',
          amount,
          note,
        };
      }
    } catch (e) {
      // not URL
    }
  }

  // 3. User ID starting with usr_ or usr_kamekaz_
  if (trimmed.startsWith('usr_')) {
    return {
      raw: trimmed,
      userId: trimmed,
      method: 'qr',
      app: 'sdeedpay',
    };
  }

  // 4. Phone number format e.g. +961 70 889900
  if (/^\+?[0-9\s-]{7,18}$/.test(trimmed)) {
    return {
      raw: trimmed,
      userId: trimmed,
      method: 'phone',
      app: 'sdeedpay',
    };
  }

  // 5. Fallback plain alphanumeric string
  if (trimmed.length >= 3 && trimmed.length <= 64 && !trimmed.includes('\n')) {
    return {
      raw: trimmed,
      userId: trimmed,
      method: 'qr',
      app: 'sdeedpay',
    };
  }

  return null;
}

interface QrCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (payload: ParsedQrPayload) => void;
  knownUsers?: SpUser[];
}

export function QrCameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  knownUsers = [],
}: QrCameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'recent' | 'simulation'>('camera');
  const [uploadedFileStatus, setUploadedFileStatus] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<ParsedQrPayload | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Load recent scans from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SCANS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentScans(parsed.slice(0, MAX_RECENT_SCANS));
        }
      }
    } catch (e) {
      console.warn('Failed to load recent scans from localStorage', e);
    }
  }, []);

  // Save recent scans to localStorage and update state
  const saveRecentScan = useCallback((payload: ParsedQrPayload) => {
    try {
      const stored = localStorage.getItem(RECENT_SCANS_KEY);
      let list: RecentScanItem[] = [];
      if (stored) {
        list = JSON.parse(stored);
        if (!Array.isArray(list)) list = [];
      }

      // Find user metadata if available from knownUsers
      const matchedUser = knownUsers.find((u) => u.id === payload.userId || u.phone === payload.userId);

      const newItem: RecentScanItem = {
        userId: payload.userId,
        name: payload.name || matchedUser?.name,
        phone: matchedUser?.phone,
        method: payload.method,
        timestamp: Date.now(),
        amount: payload.amount,
      };

      // Filter out existing duplicates for the same userId, place newest at top, cap at MAX_RECENT_SCANS
      const updated = [newItem, ...list.filter((item) => item.userId !== newItem.userId)].slice(0, MAX_RECENT_SCANS);

      setRecentScans(updated);
      localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save recent scan to localStorage', e);
    }
  }, [knownUsers]);

  // Remove a single item from recent scans
  const handleDeleteRecentScan = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentScans.filter((item) => item.userId !== userId);
      setRecentScans(updated);
      localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to delete recent scan', err);
    }
  };

  // Clear all recent scans
  const handleClearAllRecentScans = () => {
    try {
      setRecentScans([]);
      localStorage.removeItem(RECENT_SCANS_KEY);
    } catch (err) {
      console.warn('Failed to clear recent scans', err);
    }
  };

  // Quick re-select a recent scan item
  const handleSelectRecentScan = (item: RecentScanItem) => {
    const payload: ParsedQrPayload = {
      raw: JSON.stringify({
        user_id: item.userId,
        app: 'sdeedpay',
        name: item.name,
        phone: item.phone,
        amount: item.amount,
      }),
      userId: item.userId,
      method: item.method,
      app: 'sdeedpay',
      name: item.name,
      amount: item.amount,
    };
    handlePayloadDetected(payload);
  };

  // Play audio chime on successful scan
  const playChime = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  }, []);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Handle successful payload detection
  const handlePayloadDetected = useCallback(
    (payload: ParsedQrPayload) => {
      setScannedResult(payload);
      saveRecentScan(payload);
      playChime();
      stopCamera();

      // Brief delay to let the user see the visual match confirmation before auto-closing
      setTimeout(() => {
        onScanSuccess(payload);
        onClose();
      }, 700);
    },
    [onScanSuccess, onClose, playChime, stopCamera, saveRecentScan]
  );

  // Core frame scanner loop
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const parsed = parseSdeedPayPayload(code.data);
        if (parsed) {
          handlePayloadDetected(parsed);
          return;
        }
      }
    } catch (err) {
      console.warn('Frame processing error:', err);
    }

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [handlePayloadDetected]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setScannedResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this browser or environment.');
      setHasCameraPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as unknown as {
          torch?: boolean;
        };
        setHasTorch(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // required for iOS safari
        await videoRef.current.play();
        setIsScanning(true);
        setHasCameraPermission(true);
        animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errorMsg =
        err instanceof Error
          ? err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'Camera access permission was denied. Please allow camera permissions in your browser settings or use image file upload.'
            : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
            ? 'No camera device found on this system. You can upload a QR image or select from preset test codes.'
            : `Unable to access camera: ${err.message}`
          : 'Unable to initialize camera.';
      setCameraError(errorMsg);
      setHasCameraPermission(false);
    }
  }, [facingMode, scanFrame, stopCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const newTorchState = !torchOn;
        await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: newTorchState }],
        });
        setTorchOn(newTorchState);
      } catch (e) {
        console.warn('Torch not supported:', e);
      }
    }
  };

  // Toggle Facing Mode
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle File Upload for QR image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileStatus('Analyzing image file...');
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setUploadedFileStatus('Failed to create canvas context for image.');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const parsed = parseSdeedPayPayload(code.data);
          if (parsed) {
            setUploadedFileStatus(`QR Detected! User ID: ${parsed.userId}`);
            handlePayloadDetected(parsed);
          } else {
            setUploadedFileStatus(
              `Found raw QR code: "${code.data.slice(0, 30)}..." but it could not be identified as a SdeedPay user payload.`
            );
          }
        } else {
          setUploadedFileStatus('No QR code detected in the uploaded image. Please try another image or use live camera.');
        }
      };
      img.onerror = () => {
        setUploadedFileStatus('Failed to load image file.');
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  // Handle Preset Simulation Scan
  const handleSimulateScan = (user: SpUser, customAmount?: number) => {
    const payload: ParsedQrPayload = {
      raw: JSON.stringify({
        user_id: user.id,
        app: 'sdeedpay',
        name: user.name,
        phone: user.phone,
        amount: customAmount || 25,
      }),
      userId: user.id,
      method: 'qr',
      app: 'sdeedpay',
      name: user.name,
      amount: customAmount || 25,
    };
    handlePayloadDetected(payload);
  };

  // Lifecycle effects
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/40 text-indigo-300 border border-indigo-500/40">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                SdeedPay QR Camera Scanner
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300 border border-indigo-500/30">
                  Auto-Parser
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Scan recipient's SdeedPay QR code to auto-fill User ID
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'camera'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Live Camera
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'file'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Image
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={`pb-2.5 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'recent'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5 text-indigo-600" />
            Recently Scanned ({recentScans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulation')}
            className={`pb-2.5 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'simulation'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Simulate Peer
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: LIVE CAMERA VIEW */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Video Viewport with Targeting Overlay */}
              <div className="relative mx-auto w-full max-w-sm aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-inner flex items-center justify-center">
                {/* Hidden canvas for decoding */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Video feed */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Camera Viewfinder Overlay */}
                {isScanning && !scannedResult && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    {/* Darkened backdrop frame with clear center cutout */}
                    <div className="relative w-64 h-64 border-2 border-dashed border-indigo-400/80 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      {/* Corner Reticle Brackets */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-bounce" />

                      <span className="bg-slate-900/80 text-[10px] text-white px-2 py-0.5 rounded-full font-mono tracking-wider backdrop-blur-sm border border-white/20">
                        ALIGN SDEEDPAY QR
                      </span>
                    </div>
                  </div>
                )}

                {/* Scanned Success Flash Overlay */}
                {scannedResult && (
                  <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center text-white space-y-2 animate-in zoom-in-95">
                    <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                      <CheckCircle2 className="h-7 w-7 text-white" />
                    </div>
                    <div className="font-bold text-base">QR Payload Recognized!</div>
                    <div className="font-mono text-xs text-emerald-300 bg-emerald-900/80 px-2.5 py-1 rounded border border-emerald-500/40">
                      {scannedResult.userId}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Filling recipient User ID into transfer form...
                    </p>
                  </div>
                )}

                {/* Loading / Error States */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                    <AlertCircle className="h-10 w-10 text-rose-400" />
                    <div className="text-sm font-bold text-white">Camera Unavailable</div>
                    <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startCamera}
                        className="text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Camera
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab('file')}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Upload QR Image Instead
                      </Button>
                    </div>
                  </div>
                )}

                {!isScanning && !cameraError && (
                  <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                    <span>Initializing camera video feed...</span>
                  </div>
                )}
              </div>

              {/* Camera Controls Bar */}
              {isScanning && (
                <div className="flex items-center justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleFacingMode}
                    className="text-xs font-semibold border-slate-200 text-slate-700"
                    title="Switch between front and rear cameras"
                  >
                    <SwitchCamera className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                    {facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'}
                  </Button>

                  {hasTorch && (
                    <Button
                      type="button"
                      variant={torchOn ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleTorch}
                      className="text-xs font-semibold"
                    >
                      <Flashlight className="h-3.5 w-3.5 mr-1.5" />
                      {torchOn ? 'Flashlight On' : 'Flashlight'}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="text-xs font-semibold border-slate-200 text-slate-700"
                    title="Restart camera stream"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                    Reset
                  </Button>
                </div>
              )}

              {/* Quick Recently Scanned Bar (if any exists) */}
              {recentScans.length > 0 && (
                <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Recently Scanned ({recentScans.length}/5)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('recent')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    >
                      <span>View All</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {recentScans.map((item) => (
                      <button
                        key={item.userId}
                        type="button"
                        onClick={() => handleSelectRecentScan(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-slate-800 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition text-[11px] font-medium shrink-0 shadow-2xs group"
                        title={`Quick select ${item.name || item.userId}`}
                      >
                        <UserCheck className="h-3 w-3 text-indigo-600 group-hover:text-white shrink-0" />
                        <span className="font-semibold">{item.name || item.userId}</span>
                        {item.amount && (
                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-mono group-hover:bg-indigo-500 group-hover:text-white">
                            ${item.amount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips & Supported Payload Guidance */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1.5">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  Standard SdeedPay QR Schema:
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {'{"user_id": "usr_kamekaz_worker_02", "app": "sdeedpay"}'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Accepts JSON payloads, URL links, or direct <code className="font-mono text-indigo-600">usr_...</code> barcodes.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE FILE */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-8 text-center bg-indigo-50/30 hover:bg-indigo-50/60 transition cursor-pointer space-y-3"
              >
                <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Upload or Drop QR Code Image
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a photo, screenshot, or saved SdeedPay QR image (.png, .jpg, .webp)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-indigo-700 border-indigo-300"
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {uploadedFileStatus && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 flex items-start gap-2">
                  <QrCode className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{uploadedFileStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECENTLY SCANNED RECIPIENTS */}
          {activeTab === 'recent' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Quickly select a previously scanned recipient (persisted locally):
                </p>
                {recentScans.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllRecentScans}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <History className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">No Scanned Recipients Yet</div>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    When you scan a QR code with the camera or upload an image, the recipient ID will be remembered here.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveTab('camera')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold mt-2"
                  >
                    Open Live Camera
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {recentScans.map((item) => (
                    <div
                      key={item.userId}
                      onClick={() => handleSelectRecentScan(item)}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/50 transition cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition">
                          {(item.name || item.userId).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 flex items-center gap-1.5">
                            <span>{item.name || item.userId}</span>
                            {item.amount && (
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                                ${item.amount}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.userId} {item.phone ? `• ${item.phone}` : ''}
                          </div>
                          <div className="text-[9px] text-slate-400">
                            Scanned {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.method.toUpperCase()} Mode
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2.5 bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white text-xs font-bold"
                        >
                          Select
                        </Button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRecentScan(item.userId, e)}
                          className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove from recent list"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Persisted locally in browser storage (stores up to 5 entries).</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>
          )}

          {/* TAB 4: SIMULATE PEER QR CODES FOR TESTING */}
          {activeTab === 'simulation' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Click any peer below to immediately simulate scanning their official SdeedPay QR code:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {knownUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSimulateScan(user)}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-500 hover:bg-indigo-50/50 transition text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {user.id}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                      {user.phone || 'QR User'}
                    </Badge>
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Simulates full client camera scan & JSON deserialization.</span>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            jsQR Real-Time Engine
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs font-semibold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
