import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Check, ArrowRight, ArrowLeft, Loader2, ChevronUp, Save, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface VendorCategory {
  id: number;
  name: string;
  isControlled: boolean;
  controlNote: string | null;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
              step < currentStep
                ? "bg-[#D97706] text-white"
                : step === currentStep
                ? "bg-[#D97706] text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-1 w-16 md:w-24 ${
                step < currentStep ? "bg-[#D97706]" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface UserProfile {
  sellingCategories?: string[];
  registerAs?: string;
  preferredCurrency?: string;
  sponsorContent?: boolean;
}

export default function OnboardingStep4Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [registerAs] = useState("Verified Supplier");
  const [preferredCurrency, setPreferredCurrency] = useState("AED");
  const [sponsorContent, setSponsorContent] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const doPasswordsMatch = password === confirmPassword && confirmPassword !== "";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth/supplier-register");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !isAuthenticated) return;

      try {
        const [categoriesRes, currenciesRes, profileRes] = await Promise.all([
          api<VendorCategory[]>({ endpoint: "/api/reference/vendor-categories", method: "GET" }),
          api<Currency[]>({ endpoint: "/api/reference/currencies", method: "GET" }),
          api<{ profile: UserProfile | null }>({ endpoint: "/api/vendor/onboarding/profile", method: "GET", requireAuth: true }),
        ]);

        if (categoriesRes.ok && categoriesRes.data) setVendorCategories(categoriesRes.data);
        if (currenciesRes.ok && currenciesRes.data) setCurrencies(currenciesRes.data);

        if (profileRes.ok && profileRes.data?.profile) {
          const profile = profileRes.data.profile;
          if (profile.sellingCategories) setSelectedCategories(profile.sellingCategories);
          if (profile.preferredCurrency) setPreferredCurrency(profile.preferredCurrency);
          if (profile.sponsorContent !== undefined) setSponsorContent(profile.sponsorContent);
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

  const toggleCategory = (name: string) => {
    if (selectedCategories.includes(name)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== name));
    } else {
      setSelectedCategories([...selectedCategories, name]);
    }
  };

  const getFormPayload = () => ({
    sellingCategories: selectedCategories,
    registerAs,
    preferredCurrency,
    sponsorContent,
    password: password || undefined,
  });

  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step4",
        method: "POST",
        body: { ...getFormPayload(), isDraft: true },
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

    if (selectedCategories.length === 0) {
      toast({
        title: "Required Field",
        description: "Please select at least one selling category",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Required Field",
        description: "Please create a password",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordValid) {
      toast({
        title: "Invalid Password",
        description: "Password does not meet the requirements",
        variant: "destructive",
      });
      return;
    }

    if (!doPasswordsMatch) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step4",
        method: "POST",
        body: getFormPayload(),
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to save account preferences");
      }

      toast({
        title: "Account Preferences Saved",
        description: "Moving to the next step...",
      });

      navigate("/vendor/onboarding/step5");
    } catch (error: any) {
      console.error("Step 4 error:", error);
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

  const hasControlledItems = selectedCategories.some((cat) => {
    const category = vendorCategories.find((c) => c.name === cat);
    return category?.isControlled;
  });

  return (
    <div className="min-h-screen bg-[#F5F3EE] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={4} />

        <Card className="bg-[#F5F3EE] border-none shadow-none p-8 relative">
          <button
            onClick={scrollToTop}
            className="absolute top-4 right-4 w-8 h-8 bg-[#D97706] text-white rounded flex items-center justify-center hover:bg-[#B45309] transition-colors"
            data-testid="button-scroll-to-top"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <Label className="text-[#1C1C1C] font-medium text-lg">
                What product categories do you want to sell?*
              </Label>
              <p className="text-sm text-gray-500">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {vendorCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedCategories.includes(category.name)
                        ? "bg-[#D97706] text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:border-[#D97706]"
                    }`}
                    data-testid={`chip-category-${category.id}`}
                  >
                    {category.name}
                    {category.isControlled && (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                  </button>
                ))}
              </div>
              {hasControlledItems && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-medium text-sm">Controlled Items Selected</p>
                      <p className="text-amber-700 text-sm mt-1">
                        Some selected categories contain controlled items that require special licenses (MOD/EOCN/ITAR).
                        You may be required to provide additional documentation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-[#1C1C1C] font-medium">Register as</Label>
              <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg">
                <div className="w-5 h-5 rounded-full border-2 border-[#D97706] flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                </div>
                <span className="text-gray-700">Verified Supplier</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[#1C1C1C] font-medium">Preferred Currency</Label>
              <div className="flex flex-wrap gap-2">
                {currencies.map((currency) => (
                  <button
                    key={currency.id}
                    type="button"
                    onClick={() => setPreferredCurrency(currency.code)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      preferredCurrency === currency.code
                        ? "bg-[#D97706] text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:border-[#D97706]"
                    }`}
                    data-testid={`chip-currency-${currency.code.toLowerCase()}`}
                  >
                    {currency.symbol} {currency.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg">
                <div>
                  <Label className="text-[#1C1C1C] font-medium">Sponsor Product Content</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Enable sponsored placement for your products in search results and featured sections
                  </p>
                </div>
                <Switch
                  checked={sponsorContent}
                  onCheckedChange={setSponsorContent}
                  data-testid="switch-sponsor-content"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[#1C1C1C] font-medium text-lg">Create Password*</h3>
              <p className="text-sm text-gray-500">
                Set up a secure password for your vendor account
              </p>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="bg-white border-gray-300 text-[#1C1C1C] pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="bg-white border-gray-300 text-[#1C1C1C] pr-10"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-gray-600 font-medium">Password must contain:</p>
                <ul className="space-y-1">
                  <li className={`flex items-center gap-2 ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                    <Check className={`w-4 h-4 ${passwordRequirements.minLength ? 'visible' : 'invisible'}`} />
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-2 ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <Check className={`w-4 h-4 ${passwordRequirements.hasUppercase ? 'visible' : 'invisible'}`} />
                    One uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                    <Check className={`w-4 h-4 ${passwordRequirements.hasLowercase ? 'visible' : 'invisible'}`} />
                    One lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                    <Check className={`w-4 h-4 ${passwordRequirements.hasNumber ? 'visible' : 'invisible'}`} />
                    One number
                  </li>
                  <li className={`flex items-center gap-2 ${passwordRequirements.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                    <Check className={`w-4 h-4 ${passwordRequirements.hasSpecial ? 'visible' : 'invisible'}`} />
                    One special character
                  </li>
                </ul>
                {confirmPassword && !doPasswordsMatch && (
                  <p className="text-red-500 mt-2">Passwords do not match</p>
                )}
                {confirmPassword && doPasswordsMatch && (
                  <p className="text-green-600 mt-2 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Passwords match
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/vendor/onboarding/step3")}
                  className="border-gray-300 text-gray-600 hover:bg-gray-100"
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveDraft}
                  disabled={isSavingDraft}
                  className="border-[#D97706] text-[#D97706] hover:bg-[#FEF3E2]"
                  data-testid="button-save-draft"
                >
                  {isSavingDraft ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#D97706] hover:bg-[#B45309] text-white px-8"
                data-testid="button-continue"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
