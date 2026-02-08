'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SIDEBAR_PREFIXES = ['/dashboard', '/admin'];

export function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const hasSidebar = SIDEBAR_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <>
      <Header />
      {hasSidebar ? (
        /* Sidebar pages: footer is rendered inside the shell's content area */
        <>{children}</>
      ) : (
        <>
          <main className="flex-grow">{children}</main>
          <Footer />
        </>
      )}
    </>
  );
}
