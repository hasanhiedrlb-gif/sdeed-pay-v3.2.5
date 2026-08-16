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
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        <UserProvider>
          <div className="flex min-h-screen">
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
