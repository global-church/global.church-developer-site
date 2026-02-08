'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Church, Users, ChevronDown, Menu, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import type { UserSession } from '@/lib/session';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
};

const navItems: NavItem[] = [
  { href: '/admin', label: 'Churches', icon: Church, roles: ['admin', 'editor', 'support'] },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin', 'support'] },
];

export function AdminSidebar({
  session,
  children,
}: {
  session: UserSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const visibleItems = navItems.filter((item) =>
    item.roles.some((r) => session.roles.includes(r as typeof session.roles[number])),
  );

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
      <div className="p-5 border-b border-slate-800" ref={switcherRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSwitcherOpen(!switcherOpen)}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-100 hover:text-white transition-colors w-full"
          >
            Admin Portal
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
          </button>
          {switcherOpen && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-slate-800 rounded-md shadow-lg border border-slate-700 py-1 z-50">
              <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                Switch to
              </div>
              <Link
                href="/dashboard"
                onClick={() => { setSwitcherOpen(false); setSidebarOpen(false); }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              >
                Developer Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
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
    <div className="flex-grow flex flex-col bg-slate-950 text-slate-100">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden flex items-center px-4 py-3 bg-slate-900 border-b border-slate-800">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-300 hover:bg-slate-800"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="ml-3 text-sm font-semibold text-slate-100">Admin</span>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-56 bg-slate-900 shadow-xl">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop sidebar — full height, sticky */}
        <div className="hidden lg:flex lg:w-56 lg:flex-col lg:shrink-0 bg-slate-900 border-r border-slate-800">
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
