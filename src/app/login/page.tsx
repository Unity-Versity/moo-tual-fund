"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Beef, Lock, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);

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

      if (data.admin_redirect) {
        setShowAdminAuth(true);
        setPin("");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Connection error — check your internet and try again.");
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
      setError("Connection error — check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (showAdminAuth) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>The Boss is Here 🤠</CardTitle>
            <CardDescription>
              Confirm your identity, ranch master.
            </CardDescription>
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
                <p role="alert" className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Let Me In"}
              </Button>
            </form>
            <button
              onClick={() => {
                setShowAdminAuth(false);
                setError("");
                setEmail("");
                setPassword("");
              }}
              className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
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
            Enter your PIN to get moo-ving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Your PIN</Label>
              <Input
                id="pin"
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter your PIN"
                className="text-center text-lg tracking-widest"
                maxLength={6}
                required
                autoFocus
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading ? "Checking the paddock..." : "Let's Go! 🐄"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
