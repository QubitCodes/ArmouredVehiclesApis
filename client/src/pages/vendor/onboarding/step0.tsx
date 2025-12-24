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
import { Loader2, Info, Save } from "lucide-react";
import { api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const countries = [
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "IN", name: "India", flag: "🇮🇳" },
];

const countryCodes = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
];

interface UserProfile {
  country?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyPhoneCountryCode?: string;
}

export default function OnboardingStep0Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [country, setCountry] = useState("AE");
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhoneCountryCode, setCompanyPhoneCountryCode] = useState("+91");
  const [companyPhone, setCompanyPhone] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth/supplier-register");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const loadDraftData = async () => {
      if (authLoading || !isAuthenticated) return;
      
      setIsDataLoading(true);
      const response = await api<{ profile: UserProfile | null }>({
        endpoint: "/api/vendor/onboarding/profile",
        method: "GET",
        requireAuth: true,
      });

      if (response.ok && response.data?.profile) {
        const profile = response.data.profile;
        if (profile.country) setCountry(profile.country);
        if (profile.companyName) setCompanyName(profile.companyName);
        if (profile.companyEmail) setCompanyEmail(profile.companyEmail);
        if (profile.companyPhone) setCompanyPhone(profile.companyPhone);
        if (profile.companyPhoneCountryCode) setCompanyPhoneCountryCode(profile.companyPhoneCountryCode);
      }
      setIsDataLoading(false);
    };

    loadDraftData();
  }, [authLoading, isAuthenticated]);

  if (authLoading || isDataLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D97706]" />
      </div>
    );
  }

  const getFormData = () => ({
    country,
    companyName,
    companyEmail,
    companyPhone,
    companyPhoneCountryCode,
  });

  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step0",
        method: "POST",
        body: getFormData(),
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to save draft");
      }

      toast({
        title: "Draft Saved",
        description: "Your progress has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step0",
        method: "POST",
        body: getFormData(),
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to create store");
      }

      toast({
        title: "Store Created!",
        description: "Let's complete your company registration...",
      });

      navigate("/vendor/onboarding/step1");
    } catch (error: any) {
      console.error("Step 0 error:", error);
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
    setCompanyPhone(value);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#F5F3EE] border-none shadow-none p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <TooltipProvider>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="country" className="text-[#1C1C1C] font-medium">
                  Country*
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-[#3D4736] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Select the country where your business operates</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger 
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] h-12"
                  data-testid="select-country"
                >
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{countries.find(c => c.code === country)?.flag}</span>
                      <span>{countries.find(c => c.code === country)?.name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code} data-testid={`country-option-${c.code.toLowerCase()}`}>
                      <div className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="companyName" className="text-[#1C1C1C] font-medium">
                  Company Name*
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-[#3D4736] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter your registered company name</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="companyName"
                data-testid="input-company-name"
                type="text"
                placeholder="Enter company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyEmail" className="text-[#1C1C1C] font-medium">
                Email*
              </Label>
              <Input
                id="companyEmail"
                data-testid="input-company-email"
                type="email"
                placeholder="info@company.com"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                required
                className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPhone" className="text-[#1C1C1C] font-medium">
                Store Phone Number*
              </Label>
              <div className="flex gap-2">
                <Select value={companyPhoneCountryCode} onValueChange={setCompanyPhoneCountryCode}>
                  <SelectTrigger 
                    className="w-28 bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] h-12"
                    data-testid="select-phone-country"
                  >
                    <SelectValue>
                      <div className="flex items-center gap-1">
                        <span>{countryCodes.find(c => c.code === companyPhoneCountryCode)?.flag}</span>
                        <span>{companyPhoneCountryCode}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code} data-testid={`phone-country-option-${c.country.toLowerCase()}`}>
                        <div className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="companyPhone"
                  data-testid="input-company-phone"
                  type="tel"
                  placeholder="9072725777"
                  value={companyPhone}
                  onChange={handlePhoneChange}
                  required
                  className="flex-1 bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>
            </div>
          </TooltipProvider>

          <div className="flex gap-3">
            <Button
              type="button"
              data-testid="button-save-draft"
              onClick={saveDraft}
              disabled={isSavingDraft || !companyName}
              variant="outline"
              className="flex-1 border-[#D97706] text-[#D97706] hover:bg-[#FEF3E2] font-bold py-6 text-lg"
            >
              {isSavingDraft ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  SAVE DRAFT
                </>
              )}
            </Button>
            <Button
              type="submit"
              data-testid="button-create"
              disabled={isLoading || !companyName || !companyEmail || !companyPhone}
              className="flex-1 bg-[#D97706] hover:bg-[#B45309] text-white font-bold py-6 text-lg uppercase tracking-wider rounded-none"
              style={{
                clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)",
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "CREATE"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
