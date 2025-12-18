import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";

export default function LoginPage() {
  const [, setLocation] = useLocation();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    setLocation('/seller/dashboard');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-20 flex justify-center items-center min-h-[calc(100vh-400px)]">
        <Card className="w-full max-w-md shadow-lg border-muted">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display font-bold">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="buyer" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="buyer">Buyer</TabsTrigger>
                <TabsTrigger value="vendor">Vendor</TabsTrigger>
              </TabsList>
              
              <TabsContent value="buyer">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-buyer">Email</Label>
                    <Input id="email-buyer" type="email" placeholder="name@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-buyer">Password</Label>
                    <Input id="password-buyer" type="password" required />
                  </div>
                  <Button type="submit" className="w-full">Sign In</Button>
                </form>
              </TabsContent>
              
              <TabsContent value="vendor">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-vendor">Business Email</Label>
                    <Input id="email-vendor" type="email" placeholder="vendor@business.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-vendor">Password</Label>
                    <Input id="password-vendor" type="password" required />
                  </div>
                  <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700">Vendor Portal Login</Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account? <Link href="/auth/register" className="text-primary font-medium hover:underline">Register here</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
