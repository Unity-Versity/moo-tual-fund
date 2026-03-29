"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Beef, Lock, ArrowLeft } from "lucide-react";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminMode = searchParams.get("admin") === "1";

  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(isAdminMode);

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/my-order");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again!");
    } finally {
      setLoading(false);
    }
  }

  if (showAdmin) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>The boss is here. 🤠</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mootualfund.com"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Checking credentials..." : "Login"}
              </Button>
            </form>
            <button
              onClick={() => setShowAdmin(false)}
              className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to household login
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Beef className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Got Beef?</CardTitle>
          <CardDescription>
            Enter your invite code to get moo-ving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Invite Code</Label>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter your 6-digit code"
                className="text-center text-lg tracking-widest"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading ? "Checking the paddock..." : "Let's Go! 🐄"}
            </Button>
          </form>
          <button
            onClick={() => setShowAdmin(true)}
            className="mt-4 flex w-full items-center justify-center text-xs text-muted-foreground hover:text-foreground"
          >
            Admin login
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
