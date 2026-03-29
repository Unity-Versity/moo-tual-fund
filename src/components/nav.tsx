"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, Beef } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SessionData } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/slots", label: "Slots" },
  { href: "/my-order", label: "My Order" },
  { href: "/costs", label: "Costs" },
];

export function Nav({ session }: { session: SessionData | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
          <Beef className="h-6 w-6" />
          <span>Moo-tual Fund</span>
        </Link>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            if (item.href === "/my-order" && !session) return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {session?.type === "admin" && (
            <Link
              href="/admin"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              Admin
            </Link>
          )}
          {session ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
              <LogOut className="mr-1 h-4 w-4" />
              Out
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="ml-2">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              if (item.href === "/my-order" && !session) return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {session?.type === "admin" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Admin
              </Link>
            )}
            <div className="mt-2 border-t pt-2">
              {session ? (
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  {session.type === "household" ? `Logout (${session.household_name})` : "Logout (Admin)"}
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-accent hover:bg-secondary"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
