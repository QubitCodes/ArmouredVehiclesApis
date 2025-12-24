import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Shield, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
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

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6 || !registrationData) return;

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/otp/verify-email", {
        userId: registrationData.userId,
        email: registrationData.email,
        code,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully.",
      });

      navigate("/auth/add-phone");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !registrationData) return;

    setIsResending(true);

    try {
      const response = await apiRequest("POST", "/api/auth/otp/resend-email", {
        email: registrationData.email,
        userId: registrationData.userId,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }

      setCountdown(60);
      
      if (data.debugOtp) {
        toast({
          title: "Development Mode - OTP Code",
          description: `Your verification code is: ${data.debugOtp}`,
          duration: 30000,
        });
      } else {
        toast({
          title: "OTP Resent",
          description: "A new verification code has been sent to your email.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend OTP",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#2A2A2A] border-[#3D4736] p-8">
        <button
          onClick={() => navigate("/auth/supplier-register")}
          className="flex items-center text-gray-400 hover:text-white mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#3D4736] rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-[#D97706]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verify Your Email</h1>
          <p className="text-gray-400 text-center mt-2">
            We've sent a 6-digit code to{" "}
            <span className="text-white">{registrationData?.email}</span>
          </p>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#3D4736] flex items-center justify-center text-white font-medium">
              <Shield className="w-4 h-4" />
            </div>
            <span className="ml-2 text-gray-400 text-sm">Details</span>
          </div>
          <div className="flex-1 h-px bg-[#D97706] mx-2" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#D97706] flex items-center justify-center text-white font-medium">
              2
            </div>
            <span className="ml-2 text-white text-sm">Email</span>
          </div>
          <div className="flex-1 h-px bg-[#3D4736] mx-2" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-[#3D4736] flex items-center justify-center text-gray-400 font-medium">
              3
            </div>
            <span className="ml-2 text-gray-400 text-sm">Phone</span>
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-8" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              data-testid={`input-otp-${index}`}
              className="w-12 h-14 text-center text-xl font-bold bg-[#1C1C1C] border-[#3D4736] text-white focus:border-[#D97706] focus:ring-[#D97706]"
            />
          ))}
        </div>

        <Button
          onClick={handleVerify}
          data-testid="button-verify"
          disabled={isLoading || otp.some((d) => !d)}
          className="w-full bg-[#D97706] hover:bg-[#B45309] text-white py-6"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Email"}
        </Button>

        <div className="text-center mt-6">
          <p className="text-gray-400">
            Didn't receive the code?{" "}
            {countdown > 0 ? (
              <span className="text-gray-500">Resend in {countdown}s</span>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="text-[#D97706] hover:underline"
                data-testid="button-resend"
              >
                {isResending ? "Sending..." : "Resend Code"}
              </button>
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
