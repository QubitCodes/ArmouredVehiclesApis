import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "customer",
    companyName: "",
    agreeTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!formData.agreeTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement actual registration API call
      console.log("Registration data:", formData);
      
      // Simulate success and redirect to login
      setTimeout(() => {
        setLocation('/auth/login');
      }, 1000);
    } catch (error) {
      console.error("Registration failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-300px)] bg-slate-50">
        <Card className="w-full max-w-lg shadow-xl border-0">
          <CardHeader className="text-center space-y-2 pb-6">
            <h1 className="text-3xl font-display font-bold text-primary">ARMOREDMART</h1>
            <CardDescription className="text-base">Create your account to access the marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  required 
                  className="h-11"
                  data-testid="input-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  required 
                  className="h-11"
                  data-testid="input-email"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    className="h-11"
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    required 
                    className="h-11"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Account Type</Label>
                <RadioGroup 
                  value={formData.userType} 
                  onValueChange={(value) => updateFormData("userType", value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customer" id="customer" data-testid="radio-customer" />
                    <Label htmlFor="customer" className="font-normal cursor-pointer">Customer / Buyer</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vendor" id="vendor" data-testid="radio-vendor" />
                    <Label htmlFor="vendor" className="font-normal cursor-pointer">Vendor / Supplier</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.userType === "vendor" && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName" 
                    type="text" 
                    placeholder="Your Company Ltd." 
                    value={formData.companyName}
                    onChange={(e) => updateFormData("companyName", e.target.value)}
                    required={formData.userType === "vendor"}
                    className="h-11"
                    data-testid="input-company-name"
                  />
                </div>
              )}
              
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => updateFormData("agreeTerms", checked as boolean)}
                  data-testid="checkbox-terms"
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold bg-orange-600 hover:bg-orange-700" 
                disabled={isLoading}
                data-testid="button-register"
              >
                {isLoading ? "Creating Account..." : "CREATE ACCOUNT"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/auth/login" className="text-primary font-bold hover:underline">Sign in here</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
