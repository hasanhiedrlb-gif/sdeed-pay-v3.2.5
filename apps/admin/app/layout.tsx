import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import SdeedPayHeader from '@/components/SdeedPayHeader';
import { UserProvider } from '@/lib/user-context';

export const metadata: Metadata = {
  title: 'sdeedpay v1.1.0 - Smart Payments Bank',
  description: 'Financial Bank, AI Deposit Combination Optimizer & Liquidity Pool',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="text-[#F8FAFC] antialiased font-sans min-h-screen selection:bg-[#4F8AFF]/30 selection:text-white">
        <UserProvider>
          {/* Subtle Ambient Glowing Orbs */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#4F8AFF]/15 blur-[120px]" />
            <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-[#38BDF8]/10 blur-[130px]" />
            <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#1A2340]/40 blur-[140px]" />
          </div>

          <div className="relative z-10 flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-x-hidden">
              <SdeedPayHeader />
              <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
            </div>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
