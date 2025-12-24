import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, ArrowRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SupplierRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/otp/register/start", {
        ...formData,
        userType: "vendor",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start registration");
      }

      // Use data from server (important for resuming incomplete registrations)
      localStorage.setItem("pendingRegistration", JSON.stringify({
        userId: data.userId,
        email: data.email || formData.email,
        name: data.name || formData.name,
        username: data.username || formData.username,
      }));

      // If email is verified but phone is not, redirect to phone step
      if (data.continueToPhone) {
        toast({
          title: "Continuing Registration",
          description: "Your email is verified. Please add your phone number.",
        });
        navigate("/auth/add-phone");
        return;
      }

      if (data.debugOtp) {
        toast({
          title: data.resuming ? "Resuming Registration - OTP Code" : "Development Mode - OTP Code",
          description: `Your verification code is: ${data.debugOtp}`,
          duration: 30000,
        });
      } else {
        toast({
          title: data.resuming ? "Resuming Registration" : "OTP Sent",
          description: data.resuming 
            ? "Continuing your previous registration. OTP sent to your email."
            : "A verification code has been sent to your email.",
        });
      }

      navigate("/auth/verify-email");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#2A2A2A] border-[#3D4736] p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#3D4736] rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-[#D97706]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Become a Supplier</h1>
          <p className="text-gray-400 text-center mt-2">
            Join ArmoredMart and start selling defense vehicle parts
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#D97706] flex items-center justify-center text-white font-medium">
              1
            </div>
            <span className="ml-2 text-white text-sm">Details</span>
          </div>
          <div className="flex-1 h-px bg-[#3D4736] mx-2" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#3D4736] flex items-center justify-center text-gray-400 font-medium">
              2
            </div>
            <span className="ml-2 text-gray-400 text-sm">Email</span>
          </div>
          <div className="flex-1 h-px bg-[#3D4736] mx-2" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#3D4736] flex items-center justify-center text-gray-400 font-medium">
              3
            </div>
            <span className="ml-2 text-gray-400 text-sm">Phone</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Full Name</Label>
            <Input
              id="name"
              data-testid="input-name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-[#1C1C1C] border-[#3D4736] text-white placeholder:text-gray-500 focus:border-[#D97706] focus:ring-[#D97706]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email Address</Label>
            <Input
              id="email"
              data-testid="input-email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-[#1C1C1C] border-[#3D4736] text-white placeholder:text-gray-500 focus:border-[#D97706] focus:ring-[#D97706]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input
              id="username"
              data-testid="input-username"
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="bg-[#1C1C1C] border-[#3D4736] text-white placeholder:text-gray-500 focus:border-[#D97706] focus:ring-[#D97706]"
            />
          </div>

          <Button
            type="submit"
            data-testid="button-continue"
            disabled={isLoading}
            className="w-full bg-[#D97706] hover:bg-[#B45309] text-white py-6"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-gray-400 mt-6">
          Already have an account?{" "}
          <a href="/auth/login" className="text-[#D97706] hover:underline" data-testid="link-login">
            Sign in
          </a>
        </p>
      </Card>
    </div>
  );
}
