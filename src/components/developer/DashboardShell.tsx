'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Key, LayoutDashboard, Settings, ChevronDown, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import type { UserSession } from '@/lib/session';

const navItems = [
  { href: '/developer', label: 'Overview', icon: LayoutDashboard },
  { href: '/developer/keys', label: 'API Keys', icon: Key },
  { href: '/developer/settings', label: 'Profile', icon: Settings },
];

export function DashboardShell({
  session,
  children,
}: {
  session: UserSession;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const hasAdmin = session.roles.length > 0;

  // Close switcher on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    if (switcherOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [switcherOpen]);

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="p-5 border-b border-gray-200" ref={switcherRef}>
        {hasAdmin ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen(!switcherOpen)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:text-gray-700 transition-colors w-full"
            >
              Developer Dashboard
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
            </button>
            {switcherOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Switch to
                </div>
                <Link
                  href="/admin"
                  onClick={() => { setSwitcherOpen(false); setSidebarOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Admin Portal
                </Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm font-semibold text-gray-900">Developer Dashboard</p>
        )}
      </div>

      <div className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex-grow flex flex-col bg-gray-50">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden flex items-center px-4 py-3 bg-white border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="ml-3 text-sm font-semibold text-gray-900">Developer</span>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 bg-white shadow-xl">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop sidebar — full height, sticky */}
        <div className="hidden lg:flex lg:w-56 lg:flex-col lg:shrink-0 bg-white border-r border-gray-200">
          <div className="sticky top-0 h-screen overflow-y-auto">
            {sidebar}
          </div>
        </div>

        {/* Main content + footer */}
        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1">
            <div className="p-6 lg:p-8 max-w-5xl">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
