"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/explorer", label: "Church Explorer" },
  { href: "/schema", label: "Schema" },
  { href: "/api-docs", label: "API" },
  { href: "/mcp-server", label: "MCP" },
  { href: "/about", label: "About" },
  { href: "/request-access", label: "Request Access" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="py-4 px-6 md:px-8 border-b border-gray-200">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/gc-logo.png"
            alt="Global.Church Logo"
            width={180}
            height={40}
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const isCTA = link.href === "/request-access";
            if (isCTA) {
              return (
                <Button key={link.href} asChild size="sm" className="ml-2">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors ${
                  isActive ? "text-primary" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="Toggle menu"
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between py-4 px-6 border-b">
              <Link href="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                <Image
                  src="/gc-logo.png"
                  alt="Global.Church Logo"
                  width={180}
                  height={40}
                  priority
                />
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col">
                {navLinks.map((link) => {
                  const isCTA = link.href === "/request-access";
                  if (isCTA) {
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-lg font-semibold py-3 mx-4 my-3 text-center rounded-md bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    );
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium py-4 text-center border-b text-gray-800 hover:bg-gray-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
