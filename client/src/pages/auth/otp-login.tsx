import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storeTokens } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

export default function OtpLoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { setAuth } = useAuth();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/login/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setStep("otp");
      setCountdown(60);

      if (data.debugOtp) {
        toast({
          title: `DEV MODE - Your OTP: ${data.debugOtp}`,
          description: "This code will expire in 10 minutes.",
          duration: 30000,
        });
      } else {
        toast({
          title: "Code Sent",
          description: "Check your email for the verification code.",
        });
      }
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
    if (code.length !== 6) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
      
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.name}`,
      });

      if (data.user.userType === "vendor") {
        navigate("/vendor/supplier-zone");
      } else if (data.user.userType === "admin" || data.user.userType === "super_admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
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
    if (countdown > 0) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/otp/login/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      setCountdown(60);

      if (data.debugOtp) {
        toast({
          title: `DEV MODE - Your OTP: ${data.debugOtp}`,
          description: "This code will expire in 10 minutes.",
          duration: 30000,
        });
      } else {
        toast({
          title: "Code Resent",
          description: "Check your email for the new verification code.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#2A2A2A] border-[#3D4736] p-8">
        {step === "email" ? (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#3D4736] rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-[#D97706]" />
              </div>
              <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
              <p className="text-gray-400 text-center mt-2">
                Enter your email to receive a login code
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email Address</Label>
                <Input
                  id="email"
                  data-testid="input-login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#1C1C1C] border-[#3D4736] text-white placeholder:text-gray-500 focus:border-[#D97706] focus:ring-[#D97706]"
                />
              </div>

              <Button
                type="submit"
                data-testid="button-send-code"
                disabled={isLoading || !email}
                className="w-full bg-[#D97706] hover:bg-[#B45309] text-white py-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Code
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-gray-400 mt-6">
              Don't have an account?{" "}
              <Link href="/auth/register" className="text-[#D97706] hover:underline" data-testid="link-register">
                Register
              </Link>
            </p>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep("email")}
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
              <h1 className="text-2xl font-bold text-white">Enter Code</h1>
              <p className="text-gray-400 text-center mt-2">
                We sent a 6-digit code to{" "}
                <span className="text-white">{email}</span>
              </p>
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
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </Button>

            <div className="text-center mt-6">
              <p className="text-gray-400">
                Didn't receive the code?{" "}
                {countdown > 0 ? (
                  <span className="text-gray-500">Resend in {countdown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-[#D97706] hover:underline"
                    data-testid="button-resend"
                  >
                    Resend Code
                  </button>
                )}
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
