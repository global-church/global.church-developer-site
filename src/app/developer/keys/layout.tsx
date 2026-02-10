import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'API Keys | Global.Church Developer',
};

export default function KeysLayout({ children }: { children: ReactNode }) {
  return children;
}
