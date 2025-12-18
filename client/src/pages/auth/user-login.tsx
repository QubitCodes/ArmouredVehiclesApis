import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { api } from "@/lib/mockApi";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Simulate API call
      const user = await api.login(email);
      // In a real app, we'd store the token/user here
      
      // Redirect based on role or to home
      if (user.is_vendor) {
        setLocation('/seller/dashboard');
      } else {
        setLocation('/account/profile');
      }
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-400px)] bg-slate-50">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center space-y-2 pb-8">
            <h1 className="text-3xl font-display font-bold text-primary">ARMOREDMART</h1>
            <CardDescription className="text-base">The World's First Compliance Integrated Defence E-Store</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/auth/forgot-password">
                    <span className="text-xs text-primary hover:underline cursor-pointer">Forgot Password?</span>
                  </Link>
                </div>
                <Input id="password" type="password" required className="h-11" />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </label>
              </div>

              <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-100">
                <strong>Tip for Demo:</strong> Use an email containing "vendor" to login as a Vendor/Supplier.
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                {isLoading ? "Signing In..." : "LOGIN"}
              </Button>
            </form>
            
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account? <Link href="/auth/register" className="text-primary font-bold hover:underline">Register here</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
