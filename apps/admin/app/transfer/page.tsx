'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useUser } from '@/lib/user-context';
import { sdeedpayApi, KAMEKAZ_API_URL, SDEED_API_URL } from '@/lib/sdeedpay-api';
import { SpP2PTransfer, KycStatus, SpUser, FrequentTransferTemplate, TemplateCategory } from '@/lib/sdeedpay-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Send,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  UserCheck,
  KeyRound,
  Copy,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Calendar,
  DollarSign,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  Layers,
  Sparkles,
  Download,
  FileImage,
  Check,
  Star,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Edit3,
  Plus,
  Users,
  Tag,
  Zap,
  X,
  SlidersHorizontal,
  UserPlus,
  FileText,
  CheckCheck,
  Camera,
  Scan,
  ScanLine,
  Share2,
} from 'lucide-react';
import { QrCameraScannerModal, ParsedQrPayload } from '@/components/QrCameraScannerModal';
import { QrDownloadModal } from '@/components/QrDownloadModal';

export default function TransferPage() {
  const { currentUser, users, refreshUsers } = useUser();
  const [activeTab, setActiveTab] = useState<'send' | 'qr' | 'history' | 'kyc'>('send');
  
  // Transfer Form State
  const [method, setMethod] = useState<'phone' | 'qr'>('phone');
  const [recipientInput, setRecipientInput] = useState('');
  const [amount, setAmount] = useState<number>(10);
  const [transferLoading, setTransferLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isQrDownloadOpen, setIsQrDownloadOpen] = useState(false);

  const handleQrScanSuccess = (payload: ParsedQrPayload) => {
    setMethod(payload.method || 'qr');
    setRecipientInput(payload.userId);
    if (payload.amount && !isNaN(payload.amount)) {
      setAmount(payload.amount);
    }
    setErrorMessage(null);
    setSuccessMessage(
      `QR Code Scanned Successfully! Recipient User ID automatically filled: ${payload.userId}${
        payload.name ? ` (${payload.name})` : ''
      }${payload.amount ? ` • Preset Amount: $${payload.amount}` : ''}`
    );
  };

  // OTP Confirmation Modal State
  const [pendingTransfer, setPendingTransfer] = useState<{
    transfer: SpP2PTransfer;
    otp_code: string;
    recipient_name: string;
    sender_phone: string;
  } | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Transfer History & Ledger State
  const [transfers, setTransfers] = useState<SpP2PTransfer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ledgerScope, setLedgerScope] = useState<'all' | 'my'>('all');
  const [chartMetric, setChartMetric] = useState<'volume' | 'in_out' | 'count'>('volume');
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [showPrevWeek, setShowPrevWeek] = useState(true);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Chart High-Resolution PNG Export State & Ref
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // User QR Payload State
  const [qrData, setQrData] = useState<{
    user_id: string;
    app: string;
    name: string;
    phone: string | null;
    kyc_status: string;
    qr_image_url: string;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // KYC Management
  const [updatingKyc, setUpdatingKyc] = useState(false);

  // Frequent Transfers & Saved Templates State
  const [templates, setTemplates] = useState<FrequentTransferTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [saveAsTemplateChecked, setSaveAsTemplateChecked] = useState(false);
  const [templateNickname, setTemplateNickname] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('team');
  const [templateNote, setTemplateNote] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | TemplateCategory>('all');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FrequentTransferTemplate | null>(null);
  const [templateModalForm, setTemplateModalForm] = useState<{
    name: string;
    recipient_input: string;
    method: 'phone' | 'qr';
    default_amount: number;
    category: TemplateCategory;
    note: string;
  }>({
    name: '',
    recipient_input: '',
    method: 'phone',
    default_amount: 10,
    category: 'team',
    note: '',
  });
  const [templateToast, setTemplateToast] = useState<string | null>(null);

  const STORAGE_KEY = useMemo(
    () => `sdeedpay_frequent_templates_${currentUser?.id || 'default'}`,
    [currentUser?.id]
  );

  useEffect(() => {
    if (!currentUser) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored));
      } else {
        // Starter seed templates tailored to directory peers
        const initialTemplates: FrequentTransferTemplate[] = [
          {
            id: 'tmpl-nour-driver',
            name: 'Nour Khoury (Fleet Logistics)',
            recipient_input: '+96171445566',
            recipient_name: 'Nour Khoury (Driver)',
            method: 'phone',
            default_amount: 25,
            category: 'contractor',
            note: 'Weekly fuel stipend and shift mileage payout',
            created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
            last_used_at: new Date(Date.now() - 86400000 * 1).toISOString(),
            use_count: 9,
          },
          {
            id: 'tmpl-rami-courier',
            name: 'Rami Al-Hassan (Courier Lead)',
            recipient_input: '+96170112233',
            recipient_name: 'Rami Al-Hassan (Courier)',
            method: 'phone',
            default_amount: 50,
            category: 'team',
            note: 'Parcel hub operational fund dispatch',
            created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
            last_used_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            use_count: 15,
          },
          {
            id: 'tmpl-bytecraft-agency',
            name: 'ByteCraft Media Agency',
            recipient_input: 'adv_kamekaz_tech_01',
            recipient_name: 'ByteCraft Media Agency',
            method: 'qr',
            default_amount: 100,
            category: 'vendor',
            note: 'Digital banner advertising pool allocation',
            created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
            last_used_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            use_count: 6,
          },
          {
            id: 'tmpl-charbel-deliveries',
            name: 'Charbel Haddad (Deliveries)',
            recipient_input: '+96176889900',
            recipient_name: 'Charbel Haddad (Deliveries)',
            method: 'phone',
            default_amount: 20,
            category: 'contractor',
            note: 'Per-dropoff express delivery incentive',
            created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
            last_used_at: new Date(Date.now() - 86400000 * 4).toISOString(),
            use_count: 4,
          },
        ];
        setTemplates(initialTemplates);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTemplates));
      }
    } catch (err) {
      console.error('Failed to access localStorage for templates:', err);
    }
  }, [currentUser, STORAGE_KEY]);

  const saveTemplatesToStorage = (updatedTemplates: FrequentTransferTemplate[]) => {
    setTemplates(updatedTemplates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
    } catch (err) {
      console.error('Failed to persist templates:', err);
    }
  };

  // Apply a template to the transfer form
  const handleApplyTemplate = (tmpl: FrequentTransferTemplate) => {
    // Correctly map all template attributes to form state
    setMethod(tmpl.method);
    setRecipientInput(tmpl.recipient_input);
    if (tmpl.default_amount && tmpl.default_amount > 0) {
      setAmount(tmpl.default_amount);
    }
    setSelectedTemplateId(tmpl.id);
    setErrorMessage(null);

    // Update usage count and last used date
    const updated = templates.map((t) =>
      t.id === tmpl.id
        ? { ...t, use_count: (t.use_count || 0) + 1, last_used_at: new Date().toISOString() }
        : t
    );
    saveTemplatesToStorage(updated);

    setTemplateToast(
      `Applied template: "${tmpl.name}" • Recipient: ${tmpl.recipient_input} • Amount: $${tmpl.default_amount || amount}`
    );
    setTimeout(() => setTemplateToast(null), 3500);
  };

  // Clear template selection
  const handleClearTemplate = () => {
    setSelectedTemplateId(null);
  };

  // Open modal to create new template or edit existing
  const handleOpenTemplateModal = (tmpl?: FrequentTransferTemplate) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTemplateModalForm({
        name: tmpl.name,
        recipient_input: tmpl.recipient_input,
        method: tmpl.method,
        default_amount: tmpl.default_amount,
        category: tmpl.category,
        note: tmpl.note || '',
      });
    } else {
      setEditingTemplate(null);
      // Pre-fill from current transfer form if available
      const matchedUser = users.find(
        (u) => u.phone === recipientInput || u.id === recipientInput
      );
      setTemplateModalForm({
        name: matchedUser ? matchedUser.name : '',
        recipient_input: recipientInput,
        method,
        default_amount: amount || 10,
        category: 'team',
        note: '',
      });
    }
    setIsTemplateModalOpen(true);
  };

  // Save template from modal
  const handleSaveModalTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateModalForm.name.trim() || !templateModalForm.recipient_input.trim()) {
      alert('Please provide a template nickname and recipient identifier.');
      return;
    }

    const matchedUser = users.find(
      (u) =>
        u.phone === templateModalForm.recipient_input.trim() ||
        u.id === templateModalForm.recipient_input.trim()
    );
    const recipientDisplayName = matchedUser?.name || templateModalForm.name.trim();

    if (editingTemplate) {
      const updated = templates.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...t,
              name: templateModalForm.name.trim(),
              recipient_input: templateModalForm.recipient_input.trim(),
              recipient_name: recipientDisplayName,
              method: templateModalForm.method,
              default_amount: Number(templateModalForm.default_amount) || 10,
              category: templateModalForm.category,
              note: templateModalForm.note.trim(),
            }
          : t
      );
      saveTemplatesToStorage(updated);
      setTemplateToast(`Template "${templateModalForm.name.trim()}" updated successfully!`);
    } else {
      const newTemplate: FrequentTransferTemplate = {
        id: `tmpl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: templateModalForm.name.trim(),
        recipient_input: templateModalForm.recipient_input.trim(),
        recipient_name: recipientDisplayName,
        method: templateModalForm.method,
        default_amount: Number(templateModalForm.default_amount) || 10,
        category: templateModalForm.category,
        note: templateModalForm.note.trim(),
        created_at: new Date().toISOString(),
        last_used_at: undefined,
        use_count: 0,
      };
      saveTemplatesToStorage([newTemplate, ...templates]);
      setTemplateToast(`Template "${templateModalForm.name.trim()}" created successfully!`);
    }

    setIsTemplateModalOpen(false);
    setTimeout(() => setTemplateToast(null), 3500);
  };

  // Delete a template
  const handleDeleteTemplate = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the template "${name}"?`)) {
      const updated = templates.filter((t) => t.id !== id);
      saveTemplatesToStorage(updated);
      if (selectedTemplateId === id) {
        setSelectedTemplateId(null);
      }
      setTemplateToast(`Template "${name}" deleted.`);
      setTimeout(() => setTemplateToast(null), 3000);
    }
  };

  // Category styling helpers
  const getCategoryBadgeClass = (category: TemplateCategory) => {
    switch (category) {
      case 'team':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'contractor':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'vendor':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'personal':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'operations':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
  };

  const getCategoryLabel = (category: TemplateCategory) => {
    switch (category) {
      case 'team':
        return 'Team';
      case 'contractor':
        return 'Contractor / Driver';
      case 'vendor':
        return 'Vendor / Agency';
      case 'personal':
        return 'Personal';
      case 'operations':
        return 'Operations';
      default:
        return category;
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((tmpl) => {
      const matchesCategory =
        selectedCategoryFilter === 'all' || tmpl.category === selectedCategoryFilter;
      const searchLower = templateSearch.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        tmpl.name.toLowerCase().includes(searchLower) ||
        tmpl.recipient_name.toLowerCase().includes(searchLower) ||
        tmpl.recipient_input.toLowerCase().includes(searchLower) ||
        (tmpl.note && tmpl.note.toLowerCase().includes(searchLower));
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategoryFilter, templateSearch]);

  useEffect(() => {
    if (currentUser) {
      loadTransfers();
      loadQrData();
    }
  }, [currentUser]);

  async function loadTransfers() {
    setHistoryLoading(true);
    try {
      const data = await sdeedpayApi.getTransfers();
      setTransfers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  // 7-day Volume, Trailing Moving Average, and Week-over-Week Activity aggregation for Recharts
  const sevenDaysStats = useMemo(() => {
    const dataPoints: {
      dateKey: string;
      dayLabel: string;
      shortDay: string;
      fullDate: string;
      totalVolume: number;
      outboundVolume: number;
      inboundVolume: number;
      movingAvgVolume: number;
      prevWeekVolume: number;
      wowVolumeDelta: number;
      wowVolumePercent: number | null;
      count: number;
      movingAvgCount: number;
      prevWeekCount: number;
      completedCount: number;
      avgAmount: number;
    }[] = [];

    const now = new Date();
    
    // Dataset for calculation based on selected scope
    const targetTransfers = ledgerScope === 'my' && currentUser
      ? transfers.filter((t) => t.from_user_id === currentUser.id || t.to_user_id === currentUser.id)
      : transfers;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      // Current day transfers in window [d, nextD)
      const dayTransfers = targetTransfers.filter((t) => {
        const tDate = new Date(t.created_at);
        return tDate >= d && tDate < nextD;
      });

      const totalVolume = dayTransfers.reduce(
        (acc, t) => acc + (t.status === 'completed' || t.status === 'pending_otp' ? t.amount : 0),
        0
      );

      const outboundVolume = currentUser
        ? dayTransfers
            .filter((t) => t.from_user_id === currentUser.id)
            .reduce((acc, t) => acc + t.amount, 0)
        : 0;

      const inboundVolume = currentUser
        ? dayTransfers
            .filter((t) => t.to_user_id === currentUser.id)
            .reduce((acc, t) => acc + t.amount, 0)
        : 0;

      const count = dayTransfers.length;
      const completedCount = dayTransfers.filter((t) => t.status === 'completed').length;
      const avgAmount = count > 0 ? Number((totalVolume / count).toFixed(1)) : 0;

      // 7-day Trailing Moving Average ending on day d: window [d - 6 days, nextD)
      const maStartD = new Date(d);
      maStartD.setDate(maStartD.getDate() - 6);
      const maTransfers = targetTransfers.filter((t) => {
        const tDate = new Date(t.created_at);
        return tDate >= maStartD && tDate < nextD;
      });
      const maTotalVol = maTransfers.reduce(
        (acc, t) => acc + (t.status === 'completed' || t.status === 'pending_otp' ? t.amount : 0),
        0
      );
      const movingAvgVolume = Number((maTotalVol / 7).toFixed(2));
      const movingAvgCount = Number((maTransfers.length / 7).toFixed(1));

      // Same Day in Previous Week (7 days prior): window [d - 7 days, d - 6 days)
      const prevWeekStart = new Date(d);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() + 1);

      const prevWeekTransfers = targetTransfers.filter((t) => {
        const tDate = new Date(t.created_at);
        return tDate >= prevWeekStart && tDate < prevWeekEnd;
      });
      const prevWeekVolume = prevWeekTransfers.reduce(
        (acc, t) => acc + (t.status === 'completed' || t.status === 'pending_otp' ? t.amount : 0),
        0
      );
      const prevWeekCount = prevWeekTransfers.length;

      const wowVolumeDelta = Number((totalVolume - prevWeekVolume).toFixed(2));
      const wowVolumePercent = prevWeekVolume > 0
        ? Number((((totalVolume - prevWeekVolume) / prevWeekVolume) * 100).toFixed(1))
        : null;

      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });

      dataPoints.push({
        dateKey: `${monthStr} ${dayNum}`,
        dayLabel: `${dayName} (${monthStr} ${dayNum})`,
        shortDay: dayName,
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        totalVolume,
        outboundVolume,
        inboundVolume,
        movingAvgVolume,
        prevWeekVolume,
        wowVolumeDelta,
        wowVolumePercent,
        count,
        movingAvgCount,
        prevWeekCount,
        completedCount,
        avgAmount,
      });
    }

    const total7DayVolume = dataPoints.reduce((acc, r) => acc + r.totalVolume, 0);
    const prevWeek7DayVolume = dataPoints.reduce((acc, r) => acc + r.prevWeekVolume, 0);
    const wowVolumeDelta = Number((total7DayVolume - prevWeek7DayVolume).toFixed(2));
    const wowVolumePercent = prevWeek7DayVolume > 0
      ? Number((((total7DayVolume - prevWeek7DayVolume) / prevWeek7DayVolume) * 100).toFixed(1))
      : 0;

    const total7DayCount = dataPoints.reduce((acc, r) => acc + r.count, 0);
    const prevWeek7DayCount = dataPoints.reduce((acc, r) => acc + r.prevWeekCount, 0);
    const wowCountPercent = prevWeek7DayCount > 0
      ? Number((((total7DayCount - prevWeek7DayCount) / prevWeek7DayCount) * 100).toFixed(1))
      : 0;

    const peakVolume = Math.max(...dataPoints.map((r) => r.totalVolume), 0);
    const avg7DayTx = total7DayCount > 0 ? Number((total7DayVolume / total7DayCount).toFixed(2)) : 0;
    const currentMovingAvg = dataPoints[dataPoints.length - 1]?.movingAvgVolume || 0;

    return {
      data: dataPoints,
      total7DayVolume,
      prevWeek7DayVolume,
      wowVolumeDelta,
      wowVolumePercent,
      total7DayCount,
      prevWeek7DayCount,
      wowCountPercent,
      peakVolume,
      avg7DayTx,
      currentMovingAvg,
    };
  }, [transfers, currentUser, ledgerScope]);

  // High-Resolution PNG Export Handler for Recharts Visualization
  const handleDownloadChartPng = async () => {
    if (!chartContainerRef.current) return;
    setIsExportingPng(true);

    try {
      const container = chartContainerRef.current;
      const svgElement = container.querySelector('svg.recharts-surface') as SVGSVGElement | null;

      if (!svgElement) {
        throw new Error('Chart SVG surface element not found');
      }

      const svgRect = svgElement.getBoundingClientRect();
      const svgWidth = svgRect.width || svgElement.clientWidth || 800;
      const svgHeight = svgRect.height || svgElement.clientHeight || 280;

      // Clone SVG and set explicit XML attributes & font definitions
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('width', String(svgWidth));
      clonedSvg.setAttribute('height', String(svgHeight));
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // Ensure explicit font styling on all text nodes for headless SVG rendering
      const textElements = clonedSvg.querySelectorAll('text');
      textElements.forEach((t) => {
        t.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        t.style.fontSize = t.getAttribute('font-size') || '11px';
      });

      const svgXml = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(svgBlob);

      const chartImage = new Image();
      chartImage.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        chartImage.onload = () => resolve();
        chartImage.onerror = (e) => reject(e);
        chartImage.src = blobUrl;
      });

      // High-resolution Canvas (2x scale for 300 DPI / high-density report output)
      const scale = 2;
      const canvasW = 1400 * scale;
      const canvasH = 820 * scale;

      const canvas = document.createElement('canvas');
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Failed to create canvas 2D rendering context');

      ctx.scale(scale, scale);
      const virtualW = canvasW / scale;
      const virtualH = canvasH / scale;

      // 1. Clean Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, virtualW, virtualH);

      // 2. Executive Navy Gradient Header Banner
      const headerGrad = ctx.createLinearGradient(0, 0, virtualW, 0);
      headerGrad.addColorStop(0, '#0f172a');
      headerGrad.addColorStop(0.6, '#1e1b4b');
      headerGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = headerGrad;
      ctx.fillRect(0, 0, virtualW, 112);

      // Indigo Highlight Line
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(0, 110, virtualW, 2);

      // Header Branding
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('SDEEDPAY & KAMEKAZ ECOSYSTEM', 36, 42);

      ctx.fillStyle = '#a5b4fc';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('P2P Transfer Liquidity & Trailing Volume Trend Report', 36, 68);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
      const dateRangeStr = `${sevenDaysStats.data[0]?.fullDate || 'Day 1'} — ${sevenDaysStats.data[6]?.fullDate || 'Day 7'}`;
      ctx.fillText(`Audit Window: ${dateRangeStr}`, 36, 92);

      // Header Right Metadata
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px ui-sans-serif, system-ui, monospace';
      ctx.fillText(`SCOPE: ${ledgerScope === 'all' ? 'ALL NETWORK TRANSFERS' : `ACCOUNT: ${currentUser?.name || currentUser?.id}`}`, virtualW - 36, 42);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`Metric: ${chartMetric === 'volume' ? 'Total Volume ($)' : chartMetric === 'in_out' ? 'In/Out Flow ($)' : 'Transfer Count (#)'} | 7-Day MA: ${showMovingAvg ? 'Active' : 'Off'}`, virtualW - 36, 66);
      ctx.fillText(`Generated: ${new Date().toLocaleString('en-US')}`, virtualW - 36, 90);
      ctx.textAlign = 'left';

      // 3. 4 Top KPI Summary Strips
      const kpiY = 126;
      const kpiH = 74;
      const kpiMargin = 36;
      const kpiGap = 14;
      const totalKpiW = virtualW - (kpiMargin * 2);
      const cardW = (totalKpiW - (kpiGap * 3)) / 4;

      const kpis = [
        {
          title: '7-DAY TOTAL VOLUME',
          value: `$${sevenDaysStats.total7DayVolume.toFixed(2)} pts`,
          sub: `${sevenDaysStats.wowVolumePercent >= 0 ? '+' : ''}${sevenDaysStats.wowVolumePercent}% vs prev 7 days`,
          color: '#059669',
        },
        {
          title: '7-DAY MOVING AVG',
          value: `$${sevenDaysStats.currentMovingAvg.toFixed(2)} /day`,
          sub: `Prev Avg: $${(sevenDaysStats.prevWeek7DayVolume / 7).toFixed(2)}/d`,
          color: '#0891b2',
        },
        {
          title: 'TOTAL TRANSACTIONS',
          value: `${sevenDaysStats.total7DayCount} tx`,
          sub: `${sevenDaysStats.wowCountPercent >= 0 ? '+' : ''}${sevenDaysStats.wowCountPercent}% vs prev week`,
          color: '#4f46e5',
        },
        {
          title: 'SINGLE-DAY PEAK',
          value: `$${sevenDaysStats.peakVolume.toFixed(2)} pts`,
          sub: `Mean Ticket: $${sevenDaysStats.avg7DayTx.toFixed(2)}`,
          color: '#d97706',
        },
      ];

      kpis.forEach((kpi, idx) => {
        const cardX = kpiMargin + idx * (cardW + kpiGap);
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(cardX, kpiY, cardW, kpiH, 8);
        } else {
          ctx.rect(cardX, kpiY, cardW, kpiH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 9px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(kpi.title, cardX + 12, kpiY + 19);

        ctx.fillStyle = kpi.color;
        ctx.font = 'bold 16px ui-sans-serif, system-ui, monospace';
        ctx.fillText(kpi.value, cardX + 12, kpiY + 43);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(kpi.sub, cardX + 12, kpiY + 62);
      });

      // 4. Main Chart Card Box
      const chartCardY = 214;
      const chartCardH = 540;
      const chartCardW = virtualW - (kpiMargin * 2);

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(kpiMargin, chartCardY, chartCardW, chartCardH, 8);
      } else {
        ctx.rect(kpiMargin, chartCardY, chartCardW, chartCardH);
      }
      ctx.fill();
      ctx.stroke();

      // Chart Card Header
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `Visualization: ${chartMetric === 'volume' ? 'Total Volume ($)' : chartMetric === 'in_out' ? 'Inflow vs Outflow ($)' : 'Transfer Velocity & Count (#)'}`,
        kpiMargin + 16,
        chartCardY + 28
      );

      // Legend Strip in PNG
      let legendX = kpiMargin + 16;
      const legendY = chartCardY + 50;

      if (chartMetric === 'volume') {
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(legendX + 4, legendY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('Daily Volume ($)', legendX + 14, legendY);
        legendX += 125;

        if (showMovingAvg) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(legendX, legendY - 6, 12, 3);
          ctx.fillStyle = '#1e293b';
          ctx.fillText('7-Day Moving Avg ($)', legendX + 18, legendY);
          legendX += 150;
        }

        if (showPrevWeek) {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(legendX, legendY - 6, 12, 3);
          ctx.fillStyle = '#1e293b';
          ctx.fillText('Prev Week Baseline ($)', legendX + 18, legendY);
          legendX += 160;
        }
      } else if (chartMetric === 'in_out') {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(legendX + 4, legendY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('Inbound Received ($)', legendX + 14, legendY);
        legendX += 150;

        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(legendX + 4, legendY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Outbound Sent ($)', legendX + 14, legendY);
        legendX += 140;

        if (showMovingAvg) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(legendX, legendY - 6, 12, 3);
          ctx.fillStyle = '#1e293b';
          ctx.fillText('7-Day MA ($)', legendX + 18, legendY);
          legendX += 120;
        }
      } else {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(legendX + 4, legendY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('Transfer Count (#)', legendX + 14, legendY);
        legendX += 140;

        if (showMovingAvg) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(legendX, legendY - 6, 12, 3);
          ctx.fillStyle = '#1e293b';
          ctx.fillText('7-Day MA Count (#)', legendX + 18, legendY);
          legendX += 150;
        }

        if (showPrevWeek) {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(legendX, legendY - 6, 12, 3);
          ctx.fillStyle = '#1e293b';
          ctx.fillText('Prev Week Count (#)', legendX + 18, legendY);
          legendX += 150;
        }

        ctx.fillStyle = '#10b981';
        ctx.fillRect(legendX, legendY - 6, 12, 3);
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Settled (#)', legendX + 18, legendY);
      }

      // Draw SVG chart onto canvas
      const targetSvgW = chartCardW - 32;
      const targetSvgH = chartCardH - 76;
      ctx.drawImage(chartImage, kpiMargin + 16, chartCardY + 62, targetSvgW, targetSvgH);

      // 5. Footer Notes
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(
        `Confidential Report — Generated via SdeedPay Ledger & Kamekaz Identity Verification Gateway | High-Resolution 2x PNG Export`,
        36,
        virtualH - 16
      );
      ctx.textAlign = 'right';
      ctx.fillText(`Report Ref: SP-REP-${Date.now().toString(36).toUpperCase()}`, virtualW - 36, virtualH - 16);
      ctx.textAlign = 'left';

      URL.revokeObjectURL(blobUrl);

      // Trigger automatic PNG download
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      const downloadLink = document.createElement('a');
      const dateIso = new Date().toISOString().split('T')[0];
      downloadLink.download = `sdeedpay-transfer-analytics-${dateIso}.png`;
      downloadLink.href = pngUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setExportSuccessMsg('High-resolution chart image (PNG) downloaded successfully!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to export chart PNG:', err);
      alert('Failed to generate PNG image: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExportingPng(false);
    }
  };

  async function loadQrData() {
    if (!currentUser) return;
    setQrLoading(true);
    try {
      const data = await sdeedpayApi.getQrPayload(currentUser.id);
      setQrData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setQrLoading(false);
    }
  }

  async function handleInitiateTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // KYC Check
    if (currentUser.kyc_status !== 'verified') {
      setErrorMessage(
        'Identity verification required: Your Kamekaz account KYC is unverified. Please complete KYC verification first.',
      );
      return;
    }

    if (!recipientInput.trim()) {
      setErrorMessage(
        method === 'phone'
          ? 'Please enter the recipient phone number (e.g. +961 70 889900)'
          : 'Please enter or scan the recipient Kamekaz User ID (e.g. usr_kamekaz_worker_02)',
      );
      return;
    }

    if (amount <= 0) {
      setErrorMessage('Transfer amount must be at least $1.');
      return;
    }

    const pointsRequired = Number(amount) * 10;
    if (currentUser.points_balance < pointsRequired) {
      setErrorMessage(
        `Insufficient balance: Current balance is ${Number(currentUser.points_balance).toLocaleString()} pts ($${(currentUser.points_balance / 10).toFixed(2)} USD), required: ${pointsRequired} pts ($${amount} USD) at 10 Point = $1.00 USD.`,
      );
      return;
    }

    setTransferLoading(true);
    try {
      const res = await sdeedpayApi.createTransfer({
        from_user_id: currentUser.id,
        to: recipientInput.trim(),
        amount: Number(amount),
        method,
      });

      setPendingTransfer(res);
      setOtpInput(res.otp_code); // Pre-fill for easy demonstration and simulation
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initiate transfer');
    } finally {
      setTransferLoading(false);
    }
  }

  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingTransfer) return;

    setOtpError(null);
    setConfirmingOtp(true);

    try {
      const res = await sdeedpayApi.confirmTransfer({
        transfer_id: pendingTransfer.transfer.id,
        otp_code: otpInput.trim(),
      });

      // If user selected "Save as Frequent Transfer Template"
      if (saveAsTemplateChecked) {
        const customName = templateNickname.trim() || pendingTransfer.recipient_name;
        const targetInput =
          pendingTransfer.transfer.method === 'phone'
            ? pendingTransfer.transfer.to_phone || recipientInput
            : pendingTransfer.transfer.to_user_id || recipientInput;

        const existingTmpl = templates.find((t) => t.recipient_input === targetInput);
        if (!existingTmpl) {
          const newTemplate: FrequentTransferTemplate = {
            id: `tmpl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            name: customName,
            recipient_input: targetInput,
            recipient_name: pendingTransfer.recipient_name,
            method: pendingTransfer.transfer.method,
            default_amount: pendingTransfer.transfer.amount,
            category: templateCategory,
            note: templateNote.trim() || undefined,
            created_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
            use_count: 1,
          };
          saveTemplatesToStorage([newTemplate, ...templates]);
        }
      }

      setSuccessMessage(
        `Transfer of $${res.transfer.amount} to ${pendingTransfer.recipient_name} completed successfully!`,
      );
      setPendingTransfer(null);
      setOtpInput('');
      setRecipientInput('');
      setSelectedTemplateId(null);
      setSaveAsTemplateChecked(false);
      setTemplateNickname('');
      setTemplateNote('');
      await refreshUsers();
      await loadTransfers();
    } catch (err: any) {
      setOtpError(err?.message || 'Invalid OTP code');
    } finally {
      setConfirmingOtp(false);
    }
  }

  async function handleToggleKyc(newStatus: 'verified' | 'unverified' | 'pending') {
    if (!currentUser) return;
    setUpdatingKyc(true);
    try {
      await sdeedpayApi.updateKycStatus(currentUser.id, newStatus);
      await refreshUsers();
      await loadQrData();
      setSuccessMessage(`Kamekaz KYC status updated to: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update KYC status');
    } finally {
      setUpdatingKyc(false);
    }
  }

  function handleCopyQrString() {
    if (!currentUser) return;
    const payload = JSON.stringify({ user_id: currentUser.id, app: 'sdeedpay' });
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              sdeedpay v1.2.0 • P2P & KYC
            </span>
            <span className="text-xs text-slate-400 font-mono">From: {currentUser?.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Send className="h-6 w-6 text-indigo-400" />
            P2P Instant Transfer & QR Code
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Instant peer-to-peer point transfers between Kamekaz ecosystem users with SMS OTP validation & KYC identity enforcement.
          </p>
        </div>

        {/* User Balance & KYC Badge */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-md text-right min-w-[170px]">
            <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold block">
              Available Balance
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {Number(currentUser?.points_balance || 0).toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-300">pts</span>
            </div>
            <p className="text-xs font-medium text-emerald-300/90 font-mono">
              ≈ ${((currentUser?.points_balance || 0) / 10).toFixed(2)} USD
            </p>
            <div className="mt-1 flex items-center justify-end gap-1.5">
              {currentUser?.kyc_status === 'verified' ? (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/40">
                  <ShieldCheck className="h-3 w-3" /> Kamekaz KYC Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
                  <ShieldAlert className="h-3 w-3" /> KYC Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KYC Alert if Unverified */}
      {currentUser?.kyc_status !== 'verified' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Identity Verification Required (Kamekaz KYC)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                As per SdeedPay banking security regulations, your identity must be verified in Kamekaz before initiating P2P transfers or withdrawals.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleToggleKyc('verified')}
            disabled={updatingKyc}
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs whitespace-nowrap shadow-sm"
          >
            {updatingKyc ? 'Verifying...' : 'Verify KYC in Kamekaz'}
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition shrink-0 ${
              activeTab === 'send'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Send className="h-4 w-4" />
            Send Money (P2P)
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition shrink-0 ${
              activeTab === 'qr'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <QrCode className="h-4 w-4" />
            My QR Code
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition shrink-0 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Transfer Ledger ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition shrink-0 ${
              activeTab === 'kyc'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Kamekaz KYC Simulator
          </button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setIsQrDownloadOpen(true)}
          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold h-8.5 px-3 flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Download className="h-3.5 w-3.5 text-indigo-600" />
          <span>Generate & Download My QR</span>
        </Button>
      </div>

      {/* Toast Notification */}
      {templateToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCheck className="h-4 w-4 text-emerald-400" />
          <span>{templateToast}</span>
        </div>
      )}

      {/* TAB 1: SEND MONEY (P2P) */}
      {activeTab === 'send' && (
        <div className="space-y-6">
          {/* Quick-Fill Ribbon: Frequent Recipients Carousel */}
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                    <Star className="h-4 w-4 fill-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      Frequent Transfers (1-Click Fill)
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        {templates.length} Saved
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tap any frequent recipient below to pre-populate method, contact info, and amount instantly.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenTemplateModal()}
                  className="h-8 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> New Template
                </Button>
              </div>

              {templates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-indigo-200 p-4 text-center text-xs text-slate-500">
                  No frequent transfer templates saved yet. Click "+ New Template" or check "Save as Frequent Template" during your next payment.
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                  {templates.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition shrink-0 min-w-[200px] max-w-[260px] ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/90 shadow-sm ring-2 ring-indigo-500/20'
                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-slate-700 text-white font-bold text-xs shadow-sm">
                          {tmpl.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {tmpl.name}
                            </span>
                            <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                              ${tmpl.default_amount}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase border ${getCategoryBadgeClass(
                                tmpl.category
                              )}`}
                            >
                              {tmpl.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono truncate">
                              {tmpl.method === 'phone' ? tmpl.recipient_input : 'QR ID'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Transfer Form */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-indigo-600" />
                      Send Points to Peer
                    </span>
                    <Badge variant="outline" className="text-xs bg-slate-50">
                      2-Step OTP Protected
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleInitiateTransfer} className="space-y-4">
                    {/* Active Template Indicator if active */}
                    {selectedTemplateId && (
                      <div className="flex items-center justify-between rounded-xl bg-indigo-50/90 p-3 border border-indigo-200 text-xs">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 fill-indigo-600 text-indigo-600 shrink-0" />
                          <div>
                            <span className="text-indigo-900 font-bold">
                              Using Template:{' '}
                              {templates.find((t) => t.id === selectedTemplateId)?.name || 'Custom'}
                            </span>
                            <span className="text-indigo-600 text-[11px] block">
                              Fields pre-filled. You can adjust the amount or details below.
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleClearTemplate}
                          className="h-7 text-xs text-indigo-700 hover:bg-indigo-100 font-semibold"
                        >
                          Clear
                        </Button>
                      </div>
                    )}

                    {/* Saved Templates Quick Select & Carousel */}
                    {templates.length > 0 && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            <span>Saved Frequent Transfers ({templates.length})</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleOpenTemplateModal()}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            <span>New Template</span>
                          </button>
                        </div>

                        {/* Dropdown Select */}
                        <div className="relative">
                          <select
                            value={selectedTemplateId || ''}
                            onChange={(e) => {
                              const chosen = templates.find((t) => t.id === e.target.value);
                              if (chosen) {
                                handleApplyTemplate(chosen);
                              } else {
                                handleClearTemplate();
                              }
                            }}
                            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">-- Choose a Saved Template / Recipient --</option>
                            {templates.map((tmpl) => (
                              <option key={tmpl.id} value={tmpl.id}>
                                ⭐ {tmpl.name} ({getCategoryLabel(tmpl.category)}) — ${tmpl.default_amount} [
                                {tmpl.method === 'phone' ? tmpl.recipient_input : 'QR ID'}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quick Selection Chips */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                          {templates.slice(0, 4).map((tmpl) => {
                            const isSelected = selectedTemplateId === tmpl.id;
                            return (
                              <button
                                key={tmpl.id}
                                type="button"
                                onClick={() => handleApplyTemplate(tmpl)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0 transition border shadow-2xs ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                                }`}
                              >
                                <span>{tmpl.name}</span>
                                <span className={`text-[10px] px-1 py-0.2 rounded font-mono font-bold ${
                                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  ${tmpl.default_amount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Method Selection: Phone vs QR */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          Transfer Method
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsQrScannerOpen(true)}
                          className="h-6 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 p-1"
                        >
                          <Camera className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Scan QR with Camera</span>
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setMethod('phone')}
                          className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold transition ${
                            method === 'phone'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Smartphone className="h-4 w-4" />
                          Phone Number Transfer
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethod('qr')}
                          className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold transition ${
                            method === 'qr'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <QrCode className="h-4 w-4" />
                          QR Code / User ID
                        </button>
                      </div>
                    </div>

                    {/* Dedicated Camera QR Quick-Scanner Callout Banner */}
                    <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/50 p-3 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shrink-0">
                          <Camera className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>SdeedPay QR Camera Scanner</span>
                            <span className="rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.2 border border-indigo-200">
                              Instant Parse
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Scan peer's SdeedPay QR code or download your personal QR payload
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsQrDownloadOpen(true)}
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-100/60 text-xs font-bold shrink-0 shadow-2xs flex items-center gap-1 h-8 px-2.5"
                        >
                          <Download className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">My QR</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setIsQrScannerOpen(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 shadow-sm flex items-center gap-1.5 h-8 px-3"
                        >
                          <Scan className="h-3.5 w-3.5" />
                          <span>Scan Camera</span>
                        </Button>
                      </div>
                    </div>

                    {/* Recipient Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          {method === 'phone' ? 'Recipient Phone Number' : 'Recipient Kamekaz User ID / QR'}
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsQrScannerOpen(true)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                        >
                          <Camera className="h-3 w-3" />
                          Scan Code
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder={method === 'phone' ? '+961 70 889900' : 'usr_kamekaz_worker_02'}
                          value={recipientInput}
                          onChange={(e) => setRecipientInput(e.target.value)}
                          className="font-mono text-sm pr-24"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setIsQrScannerOpen(true)}
                          className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 transition"
                          title="Open Camera QR Scanner"
                        >
                          <Camera className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Scan</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Select Preset Peers for Testing */}
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                        Quick Select Recipient (Kamekaz Directory):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {otherUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setRecipientInput(method === 'phone' ? u.phone : u.id);
                            }}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition flex items-center gap-1.5"
                          >
                            <span className="font-bold">{u.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({method === 'phone' ? u.phone : u.id.replace('usr_kamekaz_', '')})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          Transfer Amount (10 Point = $1.00 USD)
                        </label>
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          Rate: 10 Pts = $1.00
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">$</span>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={amount}
                          onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                          className="pl-7 font-mono font-bold text-slate-900 text-base"
                          required
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Fast presets</span>
                        <span className="font-semibold text-indigo-600 font-mono">
                          Deducts {amount * 10} pts from your balance
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {[5, 10, 20, 25, 50, 100].map((amt) => (
                          <button
                            type="button"
                            key={amt}
                            onClick={() => setAmount(amt)}
                            className={`rounded border px-2.5 py-1 text-xs font-bold transition ${
                              amount === amt
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div>${amt}</div>
                            <div className="text-[9px] font-normal text-slate-500 font-mono">
                              {amt * 10} pts
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Save As Frequent Transfer Option Box */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={saveAsTemplateChecked}
                            onChange={(e) => setSaveAsTemplateChecked(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <BookmarkPlus className="h-3.5 w-3.5 text-indigo-600" />
                            Save as Frequent Transfer Template
                          </span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium">Quick repeat payout</span>
                      </div>

                      {saveAsTemplateChecked && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-2.5 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Template Nickname (e.g. Maya - Lead Designer)
                            </label>
                            <Input
                              placeholder="Enter template label or recipient nickname"
                              value={templateNickname}
                              onChange={(e) => setTemplateNickname(e.target.value)}
                              className="text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Category Tag
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {(['team', 'contractor', 'vendor', 'personal', 'operations'] as TemplateCategory[]).map(
                                (cat) => (
                                  <button
                                    type="button"
                                    key={cat}
                                    onClick={() => setTemplateCategory(cat)}
                                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold border transition ${
                                      templateCategory === cat
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {getCategoryLabel(cat)}
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Optional Memo / Note
                            </label>
                            <Input
                              placeholder="e.g. Monthly team stipend or delivery fuel budget"
                              value={templateNote}
                              onChange={(e) => setTemplateNote(e.target.value)}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error & Success Messages */}
                    {errorMessage && (
                      <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {successMessage && (
                      <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={transferLoading || currentUser?.kyc_status !== 'verified'}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 shadow-sm"
                    >
                      {transferLoading
                        ? 'Validating KYC & Preparing SMS OTP...'
                        : `Continue to OTP Verification ($${amount})`}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Saved Recipients & Templates Management Panel */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Bookmark className="h-4 w-4 text-indigo-600" />
                      Saved Recipients & Templates
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenTemplateModal()}
                      className="h-7 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      <Plus className="h-3.5 w-3.5 mr-0.5" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-3.5 space-y-3">
                  {/* Search and Category Filter Pills */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        placeholder="Search saved templates..."
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="pl-8 text-xs h-8 bg-slate-50"
                      />
                      {templateSearch && (
                        <button
                          type="button"
                          onClick={() => setTemplateSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(['all', 'team', 'contractor', 'vendor', 'personal', 'operations'] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border transition ${
                            selectedCategoryFilter === cat
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat === 'all' ? 'All' : getCategoryLabel(cat)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Templates List */}
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {filteredTemplates.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                        <Bookmark className="mx-auto h-6 w-6 text-slate-300 mb-1.5" />
                        <p className="font-semibold text-slate-700">No matching templates found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {templateSearch || selectedCategoryFilter !== 'all'
                            ? 'Try clearing your search or category filter.'
                            : 'Save your first frequent recipient to speed up future transfers.'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTemplateModal()}
                          className="mt-3 text-xs font-bold"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Create Template
                        </Button>
                      </div>
                    ) : (
                      filteredTemplates.map((tmpl) => {
                        const isCurrentActive = selectedTemplateId === tmpl.id;
                        return (
                          <div
                            key={tmpl.id}
                            className={`rounded-xl border p-3 transition space-y-2 ${
                              isCurrentActive
                                ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                                  {tmpl.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-900">
                                      {tmpl.name}
                                    </span>
                                    <span
                                      className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase border ${getCategoryBadgeClass(
                                        tmpl.category
                                      )}`}
                                    >
                                      {tmpl.category}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                                    {tmpl.method === 'phone' ? (
                                      <>
                                        <Smartphone className="h-3 w-3 text-slate-400" />
                                        {tmpl.recipient_input}
                                      </>
                                    ) : (
                                      <>
                                        <QrCode className="h-3 w-3 text-slate-400" />
                                        {tmpl.recipient_input}
                                      </>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-extrabold text-indigo-700 border border-indigo-100">
                                ${tmpl.default_amount}
                              </span>
                            </div>

                            {tmpl.note && (
                              <p className="text-[11px] text-slate-500 italic bg-slate-50/80 rounded p-1.5 border border-slate-100">
                                "{tmpl.note}"
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                              <span>
                                Used {tmpl.use_count}x{' '}
                                {tmpl.last_used_at
                                  ? `• Last: ${new Date(tmpl.last_used_at).toLocaleDateString()}`
                                  : ''}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApplyTemplate(tmpl)}
                                  className="h-6 px-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                                >
                                  {isCurrentActive ? 'Active' : 'Use Template'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenTemplateModal(tmpl)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                                  title="Edit Template"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                                  title="Delete Template"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Protocol Security Brief */}
              <Card className="border-slate-200 shadow-sm bg-slate-50/70">
                <CardHeader className="py-2.5 px-4 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    SdeedPay v1.2.0 P2P Security Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 text-[11px] text-slate-600 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-indigo-600">• KYC Verification:</span>
                    <span>Both parties must hold verified Kamekaz ID credentials.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-indigo-600">• OTP Auth:</span>
                    <span>6-digit challenge code protects against unauthorized transfers.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-indigo-600">• Double-Entry Ledger:</span>
                    <span>Atomic balance transfers prevent double-spending or discrepancies.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* OTP CONFIRMATION MODAL OVERLAY */}
      {pendingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Authorize P2P Transfer</h3>
                  <p className="text-xs text-slate-500">Enter 6-digit SMS verification code</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                ${pendingTransfer.transfer.amount} USD
              </Badge>
            </div>

            {/* Transfer Summary */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient:</span>
                <span className="font-bold text-slate-900">{pendingTransfer.recipient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Method:</span>
                <span className="font-bold uppercase text-indigo-700">{pendingTransfer.transfer.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SMS Sent To:</span>
                <span className="font-mono text-slate-700">{pendingTransfer.sender_phone}</span>
              </div>
            </div>

            {/* Simulation Code Helper Box */}
            <div className="rounded-lg bg-indigo-50/80 p-3 border border-indigo-200 text-indigo-900 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5" /> SMS Simulated Code:
                </span>
                <span className="font-mono font-black text-sm text-indigo-700 tracking-widest bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {pendingTransfer.otp_code}
                </span>
              </div>
              <p className="text-[11px] text-indigo-700/80">
                (Demo environment auto-generates OTP. Master code <code className="font-mono font-bold">000000</code> is also accepted.)
              </p>
            </div>

            <form onSubmit={handleConfirmOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  6-Digit OTP Code
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="e.g. 849201"
                  className="font-mono text-center text-xl font-bold tracking-widest text-slate-900"
                  required
                />
              </div>

              {otpError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingTransfer(null)}
                  className="w-1/2 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={confirmingOtp || otpInput.trim().length < 6}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {confirmingOtp ? 'Confirming...' : 'Confirm & Transfer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL OVERLAY */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <BookmarkPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTemplate ? 'Edit Frequent Transfer' : 'New Frequent Transfer Template'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Save recipient details for 1-click repeat transfers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalTemplate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Template Name / Recipient Label *
                </label>
                <Input
                  placeholder="e.g. Maya - Lead Designer or Alex (Operations)"
                  value={templateModalForm.name}
                  onChange={(e) =>
                    setTemplateModalForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Transfer Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTemplateModalForm((prev) => ({ ...prev, method: 'phone' }))
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition ${
                      templateModalForm.method === 'phone'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Phone Number
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTemplateModalForm((prev) => ({ ...prev, method: 'qr' }))
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-bold transition ${
                      templateModalForm.method === 'qr'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    QR / User ID
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Recipient Address *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {templateModalForm.method === 'phone' ? '+961 phone format' : 'User ID format'}
                  </span>
                </div>
                <Input
                  placeholder={templateModalForm.method === 'phone' ? '+961 70 889900' : 'usr_kamekaz_worker_02'}
                  value={templateModalForm.recipient_input}
                  onChange={(e) =>
                    setTemplateModalForm((prev) => ({ ...prev, recipient_input: e.target.value }))
                  }
                  className="font-mono text-xs"
                  required
                />
              </div>

              {/* Quick Directory Pick in Modal */}
              <div>
                <span className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Autofill from Kamekaz Directory:
                </span>
                <div className="flex flex-wrap gap-1">
                  {otherUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setTemplateModalForm((prev) => ({
                          ...prev,
                          recipient_input: prev.method === 'phone' ? u.phone : u.id,
                          name: prev.name ? prev.name : u.name,
                        }));
                      }}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Default Amount ($) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">$</span>
                    <Input
                      type="number"
                      min="1"
                      value={templateModalForm.default_amount}
                      onChange={(e) =>
                        setTemplateModalForm((prev) => ({
                          ...prev,
                          default_amount: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="pl-6 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Category Tag
                  </label>
                  <select
                    value={templateModalForm.category}
                    onChange={(e) =>
                      setTemplateModalForm((prev) => ({
                        ...prev,
                        category: e.target.value as TemplateCategory,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="team">Team Member</option>
                    <option value="contractor">Contractor / Driver</option>
                    <option value="vendor">Vendor / Agency</option>
                    <option value="personal">Personal</option>
                    <option value="operations">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Optional Memo / Description
                </label>
                <Input
                  placeholder="e.g. Monthly cloud subscription or contractor retainer"
                  value={templateModalForm.note}
                  onChange={(e) =>
                    setTemplateModalForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                  className="text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="w-1/2 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MY QR CODE */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-6 lg:col-span-5">
            <Card className="border-slate-200 shadow-sm text-center relative overflow-hidden">
              {/* Floating Action Button (FAB) at top-right of the card */}
              <button
                type="button"
                onClick={() => setIsQrDownloadOpen(true)}
                className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/25 transition transform hover:scale-105 active:scale-95 group"
                title="Share & Download My QR Code"
              >
                <Share2 className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
                <span>Share QR</span>
              </button>

              <CardHeader className="pb-2 border-b border-slate-100 pr-24 text-left">
                <CardTitle className="text-base font-bold text-slate-900">
                  My SdeedPay QR Code
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Peers can scan this QR code to transfer points directly to your account.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* QR Code Container with interactive hover overlay */}
                <div 
                  onClick={() => setIsQrDownloadOpen(true)}
                  className="mx-auto w-64 h-64 p-3 bg-white rounded-2xl border-2 border-indigo-100 shadow-inner flex items-center justify-center relative group cursor-pointer hover:border-indigo-400 transition"
                  title="Click to customize and download your QR code"
                >
                  {qrLoading ? (
                    <div className="text-xs text-slate-400">Generating QR...</div>
                  ) : qrData ? (
                    <img
                      src={qrData.qr_image_url}
                      alt="SdeedPay QR Code"
                      className="w-full h-full object-contain rounded-lg group-hover:opacity-90 transition"
                    />
                  ) : (
                    <QrCode className="h-24 w-24 text-slate-300" />
                  )}

                  {/* Hover overlay hint */}
                  <div className="absolute inset-0 bg-indigo-950/40 rounded-2xl opacity-0 group-hover:opacity-100 backdrop-blur-[1px] transition-all flex flex-col items-center justify-center text-white p-3 space-y-1.5">
                    <div className="h-9 w-9 rounded-full bg-white text-indigo-700 flex items-center justify-center shadow-lg">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold drop-shadow">Customize & Share QR</span>
                    <span className="text-[10px] text-indigo-200">Export PNG / Card / Custom Amount</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 text-left text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">User ID:</span>
                    <span className="font-bold text-slate-900">{currentUser?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">App Identifier:</span>
                    <span className="font-bold text-indigo-600">sdeedpay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">Holder Name:</span>
                    <span className="font-sans font-bold text-slate-800">{currentUser?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans font-medium">Phone:</span>
                    <span className="font-bold text-slate-800">{currentUser?.phone}</span>
                  </div>
                </div>

                {/* Prominent Action Button Toolbar */}
                <div className="space-y-2">
                  <Button
                    onClick={() => setIsQrDownloadOpen(true)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold flex items-center justify-center gap-2 h-10 shadow-md hover:shadow-indigo-500/20 transition"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share & Download Custom QR</span>
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setIsQrDownloadOpen(true)}
                      variant="outline"
                      className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      <Download className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Download PNG</span>
                    </Button>
                    <Button
                      onClick={handleCopyQrString}
                      variant="outline"
                      className="w-full text-xs font-semibold flex items-center justify-center gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-600" />
                      <span>{copied ? 'Copied!' : 'Copy Payload'}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-6 lg:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">
                  QR Payload Specification (API: GET /api/v1/qr/:user_id)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs text-slate-600">
                <p>
                  Any mobile client scanning an official SdeedPay QR code receives the standardized JSON string payload below:
                </p>
                <div className="rounded-lg bg-slate-900 p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(
                    {
                      user_id: currentUser?.id,
                      app: 'sdeedpay',
                    },
                    null,
                    2,
                  )}
                </div>
                <p className="text-slate-500">
                  Scanning this code in the Kamekaz or Sdeed app triggers the P2P transfer route <code className="text-indigo-600 font-mono">POST /api/v1/transfer</code> with <code className="text-indigo-600 font-mono">method: 'qr'</code>.
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Sdeed Ecosystem Gateway:</span>
                  <a
                    href={SDEED_API_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-indigo-600 hover:text-indigo-800"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {SDEED_API_URL.replace('https://', '')}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFER LEDGER & HISTORY WITH RECHARTS LINE CHART */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* 7-DAY VOLUME RECHARTS VISUALIZATION CARD */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Recharts Analytics
                    </span>
                    <span className="text-[11px] text-slate-300">7-Day Trailing Window</span>
                  </div>
                  <CardTitle className="text-base font-bold text-white mt-1 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    P2P Transfer Volume & Daily Velocity
                  </CardTitle>
                  <p className="text-xs text-slate-300">
                    Real-time visualization of peer transfer values and volume flows over the last 7 days
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Scope Selector */}
                  <div className="inline-flex rounded-lg bg-slate-800/80 p-0.5 border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setLedgerScope('all')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        ledgerScope === 'all'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      All Network
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerScope('my')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        ledgerScope === 'my'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      My Account
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadChartPng}
                    disabled={isExportingPng}
                    className="text-xs flex items-center gap-1.5 bg-white/10 text-white border-white/20 hover:bg-white/20"
                    title="Export chart and KPIs as high-resolution PNG report image"
                  >
                    {isExportingPng ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-300" />
                    ) : (
                      <Download className="h-3.5 w-3.5 text-indigo-300" />
                    )}
                    <span>{isExportingPng ? 'Exporting...' : 'Export PNG'}</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadTransfers}
                    disabled={historyLoading}
                    className="text-xs flex items-center gap-1.5 bg-white/10 text-white border-white/20 hover:bg-white/20"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </div>

              {/* 4 KPI METRIC STRIPS WITH MOVING AVERAGE AND WOW COMPARISONS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/10">
                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    7-Day Total Volume
                  </span>
                  <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                    ${sevenDaysStats.total7DayVolume.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-300">pts</span>
                  </div>
                  <div className="text-[10px] mt-1 flex items-center gap-1">
                    {sevenDaysStats.wowVolumePercent >= 0 ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" /> +{sevenDaysStats.wowVolumePercent}%
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                        <ArrowDownRight className="h-3 w-3" /> {sevenDaysStats.wowVolumePercent}%
                      </span>
                    )}
                    <span className="text-slate-400">vs prev 7 days</span>
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-300 uppercase font-bold tracking-wider">
                      7-Day Moving Avg
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  </div>
                  <div className="text-xl font-black font-mono text-cyan-300 mt-0.5">
                    ${sevenDaysStats.currentMovingAvg.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-300">/day</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Activity className="h-3 w-3 text-cyan-400" />
                    <span>Prev avg: ${(sevenDaysStats.prevWeek7DayVolume / 7).toFixed(2)}/d</span>
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Transactions
                  </span>
                  <div className="text-xl font-black font-mono text-indigo-300 mt-0.5">
                    {sevenDaysStats.total7DayCount}{' '}
                    <span className="text-[10px] font-normal text-slate-300">tx</span>
                  </div>
                  <div className="text-[10px] mt-1 flex items-center gap-1">
                    {sevenDaysStats.wowCountPercent >= 0 ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" /> +{sevenDaysStats.wowCountPercent}%
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                        <ArrowDownRight className="h-3 w-3" /> {sevenDaysStats.wowCountPercent}%
                      </span>
                    )}
                    <span className="text-slate-400">vs prev week ({sevenDaysStats.prevWeek7DayCount} tx)</span>
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Single-Day Peak
                  </span>
                  <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
                    ${sevenDaysStats.peakVolume.toFixed(2)}{' '}
                    <span className="text-[10px] font-normal text-slate-300">pts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Mean ticket: <span className="text-slate-200 font-semibold">${sevenDaysStats.avg7DayTx.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 pb-4">
              {/* Success Notification Banner for PNG Download */}
              {exportSuccessMsg && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Check className="h-4 w-4 text-emerald-600" />
                    {exportSuccessMsg}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExportSuccessMsg(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Chart Controls & Trend Overlay Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700">Metric:</span>
                    <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setChartMetric('volume')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                          chartMetric === 'volume'
                            ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Total Volume ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMetric('in_out')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                          chartMetric === 'in_out'
                            ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Flow (In vs Out)
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartMetric('count')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                          chartMetric === 'count'
                            ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Transfer Count (#)
                      </button>
                    </div>
                  </div>

                  {/* Secondary Line Trend Toggles */}
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Layers className="h-3 w-3 text-slate-400" /> Trend Lines:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowMovingAvg(!showMovingAvg)}
                      className={`px-2 py-1 text-xs font-semibold rounded-md border flex items-center gap-1.5 transition ${
                        showMovingAvg
                          ? 'bg-cyan-50 border-cyan-300 text-cyan-800 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                      title="Toggle 7-day trailing moving average line"
                    >
                      <span className={`h-2 w-2 rounded-full ${showMovingAvg ? 'bg-cyan-500 ring-2 ring-cyan-200' : 'bg-slate-300'}`}></span>
                      7-Day MA
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPrevWeek(!showPrevWeek)}
                      className={`px-2 py-1 text-xs font-semibold rounded-md border flex items-center gap-1.5 transition ${
                        showPrevWeek
                          ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}
                      title="Toggle previous week same-day baseline comparison"
                    >
                      <span className={`h-2 w-2 rounded-full ${showPrevWeek ? 'bg-slate-500 ring-2 ring-slate-200' : 'bg-slate-300'}`}></span>
                      Prev Week Baseline
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {sevenDaysStats.data[0]?.fullDate} — {sevenDaysStats.data[6]?.fullDate}
                  </div>

                  {/* High-Resolution PNG Download Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadChartPng}
                    disabled={isExportingPng}
                    className="text-xs flex items-center gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 font-semibold shadow-2xs transition"
                    title="Download current Recharts visualization as high-resolution PNG image for reports"
                  >
                    {isExportingPng ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <Download className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    <span>{isExportingPng ? 'Rendering PNG...' : 'Download PNG'}</span>
                  </Button>
                </div>
              </div>

              {/* RECHARTS CONTAINER WITH SECONDARY MOVING AVERAGE LINE */}
              <div ref={chartContainerRef} className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sevenDaysStats.data}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="dateKey"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(value) => (chartMetric === 'count' ? `${value}` : `$${value}`)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          const isPositiveWoW = item.wowVolumeDelta >= 0;
                          return (
                            <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md min-w-[240px]">
                              <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 text-indigo-400" />
                                  {item.dayLabel}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">{item.shortDay}</span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-indigo-300 font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                                    Daily Volume:
                                  </span>
                                  <span className="font-mono text-sm font-bold text-white">
                                    ${item.totalVolume.toFixed(2)}
                                  </span>
                                </div>

                                {showMovingAvg && (
                                  <div className="flex items-center justify-between text-cyan-300 font-medium">
                                    <span className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                                      7-Day Moving Avg:
                                    </span>
                                    <span className="font-mono font-bold text-cyan-200">
                                      ${item.movingAvgVolume.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {showPrevWeek && (
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                      <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                                      Prev Week (Same Day):
                                    </span>
                                    <span className="font-mono text-slate-300">
                                      ${item.prevWeekVolume.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[11px]">
                                  <span className="text-slate-400">WoW Comparison:</span>
                                  <span
                                    className={`font-mono font-bold flex items-center gap-0.5 ${
                                      isPositiveWoW ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {isPositiveWoW ? '+' : ''}${item.wowVolumeDelta.toFixed(2)}
                                    {item.wowVolumePercent !== null && (
                                      <span className="text-[10px] font-normal">
                                        ({item.wowVolumePercent >= 0 ? '+' : ''}
                                        {item.wowVolumePercent}%)
                                      </span>
                                    )}
                                  </span>
                                </div>

                                {chartMetric === 'in_out' && (
                                  <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                                    <div className="flex items-center justify-between text-rose-300">
                                      <span>Outbound (Sent):</span>
                                      <span className="font-mono font-bold">-${item.outboundVolume.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-emerald-300">
                                      <span>Inbound (Received):</span>
                                      <span className="font-mono font-bold">+${item.inboundVolume.toFixed(2)}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-800/80">
                                  <span>Activity:</span>
                                  <span className="font-mono font-bold text-slate-200">
                                    {item.count} transfers {item.count > 0 ? `(avg $${item.avgAmount.toFixed(1)})` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                      formatter={(value) => <span className="text-slate-700 font-semibold">{value}</span>}
                    />

                    {/* METRIC: TOTAL VOLUME */}
                    {chartMetric === 'volume' && (
                      <>
                        {/* Primary Daily Volume Line */}
                        <Line
                          type="monotone"
                          dataKey="totalVolume"
                          name="Daily Volume ($)"
                          stroke="#4f46e5"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#4338ca', stroke: '#c7d2fe', strokeWidth: 2 }}
                        />

                        {/* Secondary 7-Day Moving Average Line */}
                        {showMovingAvg && (
                          <Line
                            type="monotone"
                            dataKey="movingAvgVolume"
                            name="7-Day Moving Avg ($)"
                            stroke="#06b6d4"
                            strokeWidth={2.2}
                            strokeDasharray="4 3"
                            dot={{ r: 3, fill: '#06b6d4', stroke: '#fff', strokeWidth: 1 }}
                            activeDot={{ r: 5.5, fill: '#0891b2', stroke: '#a5f3fc', strokeWidth: 2 }}
                          />
                        )}

                        {/* Previous Week Baseline Comparison Line */}
                        {showPrevWeek && (
                          <Line
                            type="monotone"
                            dataKey="prevWeekVolume"
                            name="Prev Week Baseline ($)"
                            stroke="#94a3b8"
                            strokeWidth={1.8}
                            strokeDasharray="5 5"
                            dot={{ r: 2.5, fill: '#94a3b8' }}
                            activeDot={{ r: 4.5, fill: '#64748b', stroke: '#e2e8f0', strokeWidth: 1.5 }}
                          />
                        )}
                      </>
                    )}

                    {/* METRIC: FLOW (IN VS OUT) */}
                    {chartMetric === 'in_out' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="inboundVolume"
                          name="Inbound Received ($)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#059669', stroke: '#a7f3d0', strokeWidth: 2 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="outboundVolume"
                          name="Outbound Sent ($)"
                          stroke="#f43f5e"
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#e11d48', stroke: '#fecdd3', strokeWidth: 2 }}
                        />
                        {showMovingAvg && (
                          <Line
                            type="monotone"
                            dataKey="movingAvgVolume"
                            name="7-Day MA Volume ($)"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            strokeDasharray="4 3"
                            dot={{ r: 3, fill: '#06b6d4' }}
                          />
                        )}
                      </>
                    )}

                    {/* METRIC: TRANSFER COUNT */}
                    {chartMetric === 'count' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Transfer Count (#)"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: '#d97706', stroke: '#fde68a', strokeWidth: 2 }}
                        />
                        {showMovingAvg && (
                          <Line
                            type="monotone"
                            dataKey="movingAvgCount"
                            name="7-Day MA Count (#)"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            strokeDasharray="4 3"
                            dot={{ r: 3, fill: '#06b6d4' }}
                          />
                        )}
                        {showPrevWeek && (
                          <Line
                            type="monotone"
                            dataKey="prevWeekCount"
                            name="Prev Week Count (#)"
                            stroke="#94a3b8"
                            strokeWidth={1.8}
                            strokeDasharray="5 5"
                            dot={{ r: 2.5, fill: '#94a3b8' }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey="completedCount"
                          name="Settled (#)"
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#10b981' }}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AUDIT TABLE & SEARCH LEDGER */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-indigo-600" />
                  P2P Transfer Ledger Records
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Comprehensive audit trail of settled and OTP-pending peer transactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search name, phone, ref..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading transfer history...</div>
              ) : transfers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No P2P transfers recorded in system.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3">Type</th>
                        <th className="p-3">Reference / ID</th>
                        <th className="p-3">Sender (From)</th>
                        <th className="p-3">Recipient (To)</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers
                        .filter((tx) => {
                          if (ledgerScope === 'my' && currentUser) {
                            if (tx.from_user_id !== currentUser.id && tx.to_user_id !== currentUser.id) {
                              return false;
                            }
                          }
                          if (!ledgerSearch.trim()) return true;
                          const q = ledgerSearch.toLowerCase();
                          return (
                            tx.reference_id?.toLowerCase().includes(q) ||
                            tx.id.toLowerCase().includes(q) ||
                            tx.from_user_name?.toLowerCase().includes(q) ||
                            tx.to_user_name?.toLowerCase().includes(q) ||
                            tx.to_phone?.toLowerCase().includes(q)
                          );
                        })
                        .map((tx) => {
                          const isOutbound = tx.from_user_id === currentUser?.id;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 transition">
                              <td className="p-3">
                                {isOutbound ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-rose-100 text-rose-800 font-bold px-2 py-0.5 text-[10px]">
                                    <ArrowUpRight className="h-3 w-3" /> OUTBOUND
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-[10px]">
                                    <ArrowDownLeft className="h-3 w-3" /> INBOUND
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-semibold text-slate-800">
                                {tx.reference_id || tx.id}
                              </td>
                              <td className="p-3 text-slate-700">
                                <span className="font-bold">{tx.from_user_name || tx.from_user_id}</span>
                              </td>
                              <td className="p-3 text-slate-700">
                                <span className="font-bold">{tx.to_user_name || tx.to_user_id}</span>
                                {tx.to_phone && (
                                  <span className="block text-[10px] text-slate-400">{tx.to_phone}</span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-bold text-sm">
                                <span className={isOutbound ? 'text-rose-600' : 'text-emerald-600'}>
                                  {isOutbound ? `-$${tx.amount}` : `+$${tx.amount}`}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5 uppercase font-bold text-[10px] border border-indigo-200">
                                  {tx.method}
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant={
                                    tx.status === 'completed'
                                      ? 'success'
                                      : tx.status === 'pending_otp'
                                      ? 'warning'
                                      : 'danger'
                                  }
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {tx.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3 text-slate-500 text-[11px]">
                                {new Date(tx.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: KAMEKAZ KYC SIMULATOR */}
      {activeTab === 'kyc' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Kamekaz Identity Verification (KYC) Gateway
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Simulate live KYC status responses from Kamekaz identity verification service
                  </p>
                </div>
                <a
                  href={KAMEKAZ_API_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-[11px] font-mono border border-slate-200 transition"
                >
                  <ExternalLink className="h-3 w-3 text-indigo-600" />
                  {KAMEKAZ_API_URL.replace('https://', '')}
                </a>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block">Current Account KYC Status</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                      {currentUser?.name}
                      <span className="text-xs font-mono text-slate-400 font-normal">({currentUser?.id})</span>
                    </h4>
                  </div>
                  <div>
                    {currentUser?.kyc_status === 'verified' && (
                      <Badge variant="success" className="text-xs font-bold uppercase px-3 py-1">
                        Verified
                      </Badge>
                    )}
                    {currentUser?.kyc_status === 'unverified' && (
                      <Badge variant="danger" className="text-xs font-bold uppercase px-3 py-1">
                        Unverified
                      </Badge>
                    )}
                    {currentUser?.kyc_status === 'pending' && (
                      <Badge variant="warning" className="text-xs font-bold uppercase px-3 py-1">
                        Pending Review
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Switch / Test KYC Status State
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={currentUser?.kyc_status === 'verified' ? 'default' : 'outline'}
                      onClick={() => handleToggleKyc('verified')}
                      disabled={updatingKyc}
                      className={
                        currentUser?.kyc_status === 'verified'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs'
                          : 'text-xs text-slate-700'
                      }
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" /> Set Verified
                    </Button>
                    <Button
                      type="button"
                      variant={currentUser?.kyc_status === 'unverified' ? 'default' : 'outline'}
                      onClick={() => handleToggleKyc('unverified')}
                      disabled={updatingKyc}
                      className={
                        currentUser?.kyc_status === 'unverified'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs'
                          : 'text-xs text-slate-700'
                      }
                    >
                      <ShieldAlert className="h-4 w-4 mr-1" /> Set Unverified
                    </Button>
                    <Button
                      type="button"
                      variant={currentUser?.kyc_status === 'pending' ? 'default' : 'outline'}
                      onClick={() => handleToggleKyc('pending')}
                      disabled={updatingKyc}
                      className={
                        currentUser?.kyc_status === 'pending'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs'
                          : 'text-xs text-slate-700'
                      }
                    >
                      <Clock className="h-4 w-4 mr-1" /> Set Pending
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-5 space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Directory Users & KYC Statuses
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 text-xs">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/70"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{u.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                    </div>
                    <Badge
                      variant={
                        u.kyc_status === 'verified'
                          ? 'success'
                          : u.kyc_status === 'pending'
                          ? 'warning'
                          : 'danger'
                      }
                      className="text-[10px] uppercase font-bold"
                    >
                      {u.kyc_status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* CAMERA QR CODE SCANNER MODAL */}
      <QrCameraScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
        knownUsers={users}
      />

      {/* GENERATE & DOWNLOAD CUSTOM QR MODAL */}
      <QrDownloadModal
        isOpen={isQrDownloadOpen}
        onClose={() => setIsQrDownloadOpen(false)}
        user={currentUser}
      />
    </div>
  );
}
