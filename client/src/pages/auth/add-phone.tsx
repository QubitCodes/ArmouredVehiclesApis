import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, ArrowLeft, ArrowRight, Loader2, Shield, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const countryCodes = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
];

export default function AddPhonePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationData, setRegistrationData] = useState<{
    userId: string;
    email: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pendingRegistration");
    if (!stored) {
      navigate("/auth/supplier-register");
      return;
    }
    setRegistrationData(JSON.parse(stored));
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationData) return;

    setIsLoading(true);
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;

    try {
      // Set phone number and get OTP from backend
      const response = await apiRequest("POST", "/api/auth/otp/set-phone", {
        userId: registrationData.userId,
        phone: phoneNumber,
        countryCode,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set phone number");
      }

      localStorage.setItem("pendingRegistration", JSON.stringify({
        ...registrationData,
        phone: fullPhoneNumber,
      }));

      // Show debug OTP in development mode
      if (data.debugOtp) {
        toast({
          title: `DEV MODE - Your Phone OTP: ${data.debugOtp}`,
          description: "This code will expire in 10 minutes. SMS not configured - use this code to verify.",
          duration: 30000,
        });
      } else {
        toast({
          title: "OTP Sent",
          description: "A verification code has been sent to your phone via SMS.",
        });
      }

      navigate("/auth/verify-phone");
    } catch (error: any) {
      console.error("Phone OTP error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setPhoneNumber(value);
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#2A2A2A] border-[#3D4736] p-8">
        <button
          onClick={() => navigate("/auth/verify-email")}
          className="flex items-center text-gray-400 hover:text-white mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#3D4736] rounded-full flex items-center justify-center mb-4">
            <Phone className="w-8 h-8 text-[#D97706]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Add Phone Number</h1>
          <p className="text-gray-400 text-center mt-2">
            Add your phone number for additional security
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#3D4736] flex items-center justify-center text-white font-medium">
              <Check className="w-4 h-4" />
            </div>
            <span className="ml-2 text-gray-400 text-sm">Details</span>
          </div>
          <div className="flex-1 h-px bg-[#3D4736] mx-2" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#3D4736] flex items-center justify-center text-white font-medium">
              <Check className="w-4 h-4" />
            </div>
            <span className="ml-2 text-gray-400 text-sm">Email</span>
          </div>
          <div className="flex-1 h-px bg-[#D97706] mx-2" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#D97706] flex items-center justify-center text-white font-medium">
              3
            </div>
            <span className="ml-2 text-white text-sm">Phone</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white">Phone Number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger
                  className="w-28 bg-[#1C1C1C] border-[#3D4736] text-white focus:border-[#D97706] focus:ring-[#D97706]"
                  data-testid="select-country-code"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-[#3D4736]">
                  {countryCodes.map((c) => (
                    <SelectItem
                      key={c.code}
                      value={c.code}
                      className="text-white hover:bg-[#3D4736] focus:bg-[#3D4736]"
                    >
                      {c.flag} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="phone"
                data-testid="input-phone"
                type="tel"
                placeholder="Enter phone number"
                value={phoneNumber}
                onChange={handlePhoneChange}
                required
                className="flex-1 bg-[#1C1C1C] border-[#3D4736] text-white placeholder:text-gray-500 focus:border-[#D97706] focus:ring-[#D97706]"
              />
            </div>
          </div>

          <Button
            type="submit"
            data-testid="button-continue"
            disabled={isLoading || phoneNumber.length < 6}
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

        <p className="text-center text-gray-400 mt-6 text-sm">
          We'll send a verification code to this number
        </p>
      </Card>
    </div>
  );
}
