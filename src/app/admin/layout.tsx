"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Beef, DollarSign, Home, Scissors, Users, Wallet, Weight } from "lucide-react";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview", icon: Home },
  { href: "/admin/status", label: "Status", icon: BarChart3 },
  { href: "/admin/cuts", label: "Cuts", icon: Scissors },
  { href: "/admin/weights", label: "Weights", icon: Weight },
  { href: "/admin/expenses", label: "Expenses", icon: DollarSign },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/households", label: "Households", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Beef className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold">Ranch HQ 🤠</h1>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
