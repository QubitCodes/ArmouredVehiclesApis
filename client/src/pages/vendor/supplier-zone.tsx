import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function SupplierZonePage() {
  const [, navigate] = useLocation();
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated || !accessToken) {
        navigate("/auth/supplier-register");
        return;
      }

      try {
        const response = await apiRequest("GET", "/api/vendor/onboarding/profile");
        const data = await response.json();

        if (!response.ok) {
          navigate("/vendor/onboarding/step0");
          return;
        }

        const profile = data.profile;
        const user = data.user;

        if (user?.userType && user.userType !== 'vendor') {
          navigate("/");
          return;
        }

        if (!profile || profile.currentStep === 0) {
          navigate("/vendor/onboarding/step0");
        } else if (profile.currentStep === 1) {
          navigate("/vendor/onboarding/step1");
        } else if (profile.currentStep === 2) {
          navigate("/vendor/onboarding/step2");
        } else if (profile.currentStep === 3) {
          navigate("/vendor/onboarding/step3");
        } else if (profile.currentStep === 4) {
          navigate("/vendor/onboarding/step4");
        } else if (profile.currentStep === 5) {
          navigate("/vendor/onboarding/step5");
        } else if (profile.currentStep === 6 && profile.onboardingStatus === 'in_progress') {
          navigate("/vendor/onboarding/identity-verification");
        } else if (profile.onboardingStatus === 'pending_verification' || profile.onboardingStatus === 'under_review' || profile.onboardingStatus === 'approved') {
          navigate("/vendor/dashboard");
        } else {
          navigate("/vendor/onboarding/step0");
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        navigate("/vendor/onboarding/step0");
      }
    };

    checkOnboardingStatus();
  }, [authLoading, isAuthenticated, accessToken, navigate]);

  return (
    <div className="min-h-screen bg-[#1C1C1C] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#D97706]" />
        <p className="text-gray-400">Loading Supplier Zone...</p>
      </div>
    </div>
  );
}
