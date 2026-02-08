"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown, Shield, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useSupabaseBrowserClient } from "@/hooks/useSupabaseBrowserClient";
import { useUserSession } from "@/contexts/SessionContext";
import { signOut } from "@/app/(auth)/actions";

const navLinks = [
  { href: "/explorer", label: "Church Explorer" },
  { href: "/schema", label: "Schema" },
  { href: "/api-docs", label: "API" },
  { href: "/mcp-server", label: "MCP" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [clientRoles, setClientRoles] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useSession();
  const supabase = useSupabaseBrowserClient();
  const userSession = useUserSession();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch roles client-side when userSession (from SessionContext) is not available
  // This happens on public pages where there's no SessionProvider wrapping the Header
  useEffect(() => {
    if (userSession || !user?.id) {
      setClientRoles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (!cancelled && data) {
        setClientRoles(data.map((r: { role: string }) => r.role));
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, userSession, supabase]);

  // Close user dropdown on outside click / escape
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        userMenuRef.current?.contains(e.target as Node) ||
        userMenuButtonRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsUserMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUserMenuOpen(false);
        userMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    // Sign out on the browser client first so onAuthStateChange fires immediately
    // and clears the user state, then sign out on the server to clear the cookie
    await supabase.auth.signOut();
    await signOut();
    router.push("/");
    router.refresh();
  };

  const isAuthenticated = !!user;

  // Display name from rich session (dashboard/admin) or basic user
  const displayName =
    userSession?.displayName ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email ||
    "Account";

  const hasRoles = userSession
    ? userSession.roles.length > 0
    : clientRoles.length > 0;

  // Derive initials for avatar
  const initials = (() => {
    const name = userSession?.displayName || (user?.user_metadata?.full_name as string | undefined);
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
      if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    }
    const email = userSession?.email || user?.email;
    if (email) return email.slice(0, 2).toUpperCase();
    return "U";
  })();

  return (
    <header className="py-4 px-6 md:px-8 border-b border-gray-200 bg-white">
      <nav className="flex items-center justify-between">
        <div className="flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/gc-logo.png"
              alt="Global.Church Logo"
              width={180}
              height={40}
              priority
            />
          </Link>
          <span className="text-[12px] text-gray-700 leading-tight mt-0.5">Developer Platform</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
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

          {!loading && isAuthenticated ? (
            /* User dropdown */
            <div className="relative ml-2">
              <button
                ref={userMenuButtonRef}
                type="button"
                onClick={() => setIsUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-1 pr-3 py-1 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isUserMenuOpen && (
                <div
                  ref={userMenuRef}
                  className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                    {userSession?.email && displayName !== userSession.email && (
                      <p className="text-xs text-gray-500 truncate">{userSession.email}</p>
                    )}
                    {!userSession?.email && user?.email && displayName !== user.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Developer Dashboard
                  </Link>

                  {hasRoles && (
                    <Link
                      href="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Portal
                    </Link>
                  )}

                  <div className="my-1 h-px bg-gray-100" />

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : !loading ? (
            <Button asChild size="sm" className="ml-2">
              <Link href="/signin">Sign In</Link>
            </Button>
          ) : null}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="Toggle menu"
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile fullscreen menu */}
      {isMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between py-4 px-6 border-b">
              <div className="flex flex-col items-center">
                <Link href="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                  <Image
                    src="/gc-logo.png"
                    alt="Global.Church Logo"
                    width={180}
                    height={40}
                    priority
                  />
                </Link>
                <span className="text-[12px] text-gray-700 leading-tight mt-0.5">Developer Platform</span>
              </div>
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
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium py-4 text-center border-b text-gray-800 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}

                {!loading && isAuthenticated ? (
                  <>
                    <div className="px-6 py-4 border-b bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                          {userSession?.email && displayName !== userSession.email && (
                            <p className="text-xs text-gray-500 truncate">{userSession.email}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-6 py-4 border-b text-gray-800 hover:bg-gray-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-5 w-5 text-gray-500" />
                      Developer Dashboard
                    </Link>

                    {hasRoles && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-3 px-6 py-4 border-b text-gray-800 hover:bg-gray-50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Shield className="h-5 w-5 text-gray-500" />
                        Admin Portal
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-6 py-4 border-b text-gray-800 hover:bg-gray-50 w-full text-left"
                    >
                      <LogOut className="h-5 w-5 text-gray-500" />
                      Sign out
                    </button>
                  </>
                ) : !loading ? (
                  <Link
                    href="/signin"
                    className="text-lg font-semibold py-3 mx-4 my-3 text-center rounded-md bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
