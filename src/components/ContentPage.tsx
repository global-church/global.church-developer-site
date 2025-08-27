import type { ReactNode } from 'react';

interface ContentPageProps {
  title: string;
  children: ReactNode;
}

export default function ContentPage({ title, children }: ContentPageProps) {
  return (
    <div className="bg-white">
      <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">{title}</h1>
        <div className="prose prose-lg max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}


