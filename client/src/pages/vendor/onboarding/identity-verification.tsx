import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, ArrowLeft, Loader2, ChevronUp, Video, MapPin, Building, CheckCircle } from "lucide-react";
import { api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface VerificationMethod {
  id: number;
  name: string;
  description: string | null;
  isAvailable: boolean;
}

function StepIndicator() {
  const steps = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm bg-[#D97706] text-white">
            <Check className="w-4 h-4" />
          </div>
          {index < steps.length - 1 && (
            <div className="h-1 w-16 md:w-24 bg-[#D97706]" />
          )}
        </div>
      ))}
    </div>
  );
}

interface UserProfile {
  verificationMethod?: string;
  submittedForApproval?: boolean;
}

export default function IdentityVerificationPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [verificationMethods, setVerificationMethods] = useState<VerificationMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth/supplier-register");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !isAuthenticated) return;

      try {
        const [methodsRes, profileRes] = await Promise.all([
          api<VerificationMethod[]>({ endpoint: "/api/reference/verification-methods", method: "GET" }),
          api<{ profile: UserProfile | null }>({ endpoint: "/api/vendor/onboarding/profile", method: "GET", requireAuth: true }),
        ]);

        if (methodsRes.ok && methodsRes.data) setVerificationMethods(methodsRes.data);

        if (profileRes.ok && profileRes.data?.profile) {
          const profile = profileRes.data.profile;
          if (profile.verificationMethod) setSelectedMethod(profile.verificationMethod);
          if (profile.submittedForApproval) setIsSubmitted(true);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [authLoading, isAuthenticated]);

  if (authLoading || isDataLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D97706]" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMethod) {
      toast({
        title: "Required Field",
        description: "Please select a verification method",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/submit-verification",
        method: "POST",
        body: { verificationMethod: selectedMethod },
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to submit for verification");
      }

      setIsSubmitted(true);

      toast({
        title: "Application Submitted",
        description: "Your vendor application has been submitted for review.",
      });
    } catch (error: any) {
      console.error("Verification submission error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getMethodIcon = (methodName: string) => {
    if (methodName.includes("Video")) return <Video className="w-6 h-6" />;
    if (methodName.includes("Location")) return <MapPin className="w-6 h-6" />;
    if (methodName.includes("Center")) return <Building className="w-6 h-6" />;
    return <Video className="w-6 h-6" />;
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <StepIndicator />

          <Card className="bg-white border border-gray-200 shadow-sm p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-[#1C1C1C]">
                Application Submitted
              </h2>
              <p className="text-gray-600 max-w-md">
                Thank you for completing your vendor registration. Your application is now under review. 
                We will contact you within 2-3 business days to schedule your identity verification.
              </p>
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md">
                <p className="text-amber-800 text-sm">
                  <strong>Selected Verification Method:</strong><br />
                  {selectedMethod}
                </p>
              </div>
              <Button
                onClick={() => navigate("/vendor/dashboard")}
                className="mt-6 bg-[#D97706] hover:bg-[#B45309] text-white px-8"
                data-testid="button-go-to-dashboard"
              >
                Go to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <StepIndicator />

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#1C1C1C]">Identity Verification</h1>
          <p className="text-gray-600 mt-2">
            Select how you would like to verify your identity to complete your vendor registration
          </p>
        </div>

        <Card className="bg-[#F5F3EE] border-none shadow-none p-8 relative">
          <button
            onClick={scrollToTop}
            className="absolute top-4 right-4 w-8 h-8 bg-[#D97706] text-white rounded flex items-center justify-center hover:bg-[#B45309] transition-colors"
            data-testid="button-scroll-to-top"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {verificationMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => method.isAvailable && setSelectedMethod(method.name)}
                  disabled={!method.isAvailable}
                  className={`w-full p-6 rounded-lg border-2 text-left transition-colors ${
                    selectedMethod === method.name
                      ? "border-[#D97706] bg-[#FEF3E2]"
                      : method.isAvailable
                      ? "border-gray-200 bg-white hover:border-[#D97706]"
                      : "border-gray-200 bg-gray-100 cursor-not-allowed opacity-60"
                  }`}
                  data-testid={`verification-method-${method.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                      selectedMethod === method.name
                        ? "bg-[#D97706] text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {getMethodIcon(method.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#1C1C1C]">{method.name}</h3>
                        {!method.isAvailable && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                            Coming Soon
                          </span>
                        )}
                        {selectedMethod === method.name && (
                          <Check className="w-5 h-5 text-[#D97706] ml-auto" />
                        )}
                      </div>
                      {method.description && (
                        <p className="text-sm text-gray-600 mt-2">{method.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/vendor/onboarding/step5")}
                className="border-gray-300 text-gray-600 hover:bg-gray-100"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !selectedMethod}
                className="bg-[#D97706] hover:bg-[#B45309] text-white px-8"
                data-testid="button-submit-application"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
