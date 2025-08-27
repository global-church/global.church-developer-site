'use client';
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  question: string;
  children: ReactNode;
}

export default function Accordion({ items }: { items: AccordionItemProps[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleClick = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="border-b border-gray-200 pb-4">
          <button
            className="flex justify-between items-center w-full text-left"
            onClick={() => handleClick(index)}
            aria-expanded={openIndex === index}
          >
            <span className="text-lg font-medium text-gray-900">{item.question}</span>
            <ChevronDown
              className={`size-5 transform transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
            />
          </button>
          {openIndex === index && (
            <div className="mt-4 text-gray-700">
              {item.children}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


