import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ArrowRight, ArrowLeft, Loader2, Upload, ChevronUp, Save } from "lucide-react";
import { api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const countryCodes = [
  { code: "+91", country: "IN", flag: "🇮🇳" },
  { code: "+971", country: "AE", flag: "🇦🇪" },
];

interface UserProfile {
  contactFullName?: string;
  contactJobTitle?: string;
  contactWorkEmail?: string;
  contactMobileCountryCode?: string;
  contactMobile?: string;
  contactIdDocumentUrl?: string;
  termsAccepted?: boolean;
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

export default function OnboardingStep2Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [idDocumentUrl, setIdDocumentUrl] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [formData, setFormData] = useState({
    contactFullName: "",
    contactJobTitle: "",
    contactWorkEmail: "",
    contactMobileCountryCode: "+91",
    contactMobile: "",
  });

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
        setFormData({
          contactFullName: profile.contactFullName || "",
          contactJobTitle: profile.contactJobTitle || "",
          contactWorkEmail: profile.contactWorkEmail || "",
          contactMobileCountryCode: profile.contactMobileCountryCode || "+91",
          contactMobile: profile.contactMobile || "",
        });
        if (profile.contactIdDocumentUrl) {
          setIdDocumentUrl(profile.contactIdDocumentUrl);
        }
        if (profile.termsAccepted) {
          setTermsAccepted(profile.termsAccepted);
        }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10 MB",
          variant: "destructive",
        });
        return;
      }
      setUploadedFile(file);
      setIdDocumentUrl(URL.createObjectURL(file));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setFormData({ ...formData, contactMobile: value });
  };

  const getFormPayload = () => ({
    ...formData,
    contactIdDocumentUrl: idDocumentUrl || null,
    termsAccepted,
  });

  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step2",
        method: "POST",
        body: getFormPayload(),
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
    
    if (!termsAccepted) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm the accuracy of information",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step2",
        method: "POST",
        body: getFormPayload(),
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to save contact details");
      }

      toast({
        title: "Contact Details Saved",
        description: "Moving to the next step...",
      });

      navigate("/vendor/onboarding/step3");
    } catch (error: any) {
      console.error("Step 2 error:", error);
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

  return (
    <div className="min-h-screen bg-[#F5F3EE] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={2} />

        <Card className="bg-[#F5F3EE] border-none shadow-none p-8 relative">
          <button
            onClick={scrollToTop}
            className="absolute top-4 right-4 w-8 h-8 bg-[#D97706] text-white rounded flex items-center justify-center hover:bg-[#B45309] transition-colors"
            data-testid="button-scroll-to-top"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[#1C1C1C] font-medium">Full Name*</Label>
              <Input
                data-testid="input-full-name"
                placeholder="Enter your full name"
                value={formData.contactFullName}
                onChange={(e) => setFormData({ ...formData, contactFullName: e.target.value })}
                required
                className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
              />
              <p className="text-[#8B8680] text-sm">Enter your complete name as it appears on your passport or ID.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Job Title</Label>
                <Input
                  data-testid="input-job-title"
                  placeholder="Type Your Job Title"
                  value={formData.contactJobTitle}
                  onChange={(e) => setFormData({ ...formData, contactJobTitle: e.target.value })}
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Work Email Address*</Label>
                <Input
                  data-testid="input-work-email"
                  type="email"
                  placeholder="Type Your Work Email Address"
                  value={formData.contactWorkEmail}
                  onChange={(e) => setFormData({ ...formData, contactWorkEmail: e.target.value })}
                  required
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Upload Passport Copy or Emirates ID*</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#D97706] rounded-lg p-6 text-center cursor-pointer hover:bg-[#D97706]/5 transition-colors"
                  data-testid="upload-id-document"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpeg,.jpg,.png,.pdf,.mp4"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-id-file"
                  />
                  <Upload className="w-8 h-8 text-[#D97706] mx-auto mb-2" />
                  {uploadedFile ? (
                    <p className="text-[#1C1C1C] font-medium">{uploadedFile.name}</p>
                  ) : idDocumentUrl ? (
                    <p className="text-[#1C1C1C] font-medium">Document uploaded</p>
                  ) : (
                    <>
                      <p className="text-[#1C1C1C] font-medium">Choose a File or Drag & Drop It Here.</p>
                      <p className="text-[#8B8680] text-sm mt-1">JPEG,PNG,PDF, and MP4 formats, up to 10 MB.</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Mobile / WhatsApp Number*</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.contactMobileCountryCode}
                    onValueChange={(v) => setFormData({ ...formData, contactMobileCountryCode: v })}
                  >
                    <SelectTrigger
                      className="w-28 bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] h-12"
                      data-testid="select-phone-country"
                    >
                      <SelectValue>
                        <div className="flex items-center gap-1">
                          <span>{countryCodes.find((c) => c.code === formData.contactMobileCountryCode)?.flag}</span>
                          <span>{formData.contactMobileCountryCode}</span>
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
                    data-testid="input-mobile"
                    type="tel"
                    placeholder="Type Your Mobile Number"
                    value={formData.contactMobile}
                    onChange={handlePhoneChange}
                    required
                    className="flex-1 bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-4 border-t border-[#B8B5A8]">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-1 border-[#B8B5A8] data-[state=checked]:bg-[#D97706] data-[state=checked]:border-[#D97706]"
                data-testid="checkbox-terms"
              />
              <Label htmlFor="terms" className="text-[#1C1C1C] text-sm leading-relaxed cursor-pointer">
                I confirm the accuracy of the information provided and that I am authorized to act on behalf of this company.
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={() => navigate("/vendor/onboarding/step1")}
                data-testid="button-back"
                variant="outline"
                className="border-gray-400 text-gray-600 hover:bg-gray-100 font-bold py-6 text-lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                BACK
              </Button>
              <Button
                type="button"
                data-testid="button-save-draft"
                onClick={saveDraft}
                disabled={isSavingDraft}
                variant="outline"
                className="border-[#D97706] text-[#D97706] hover:bg-[#FEF3E2] font-bold py-6 text-lg"
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
                data-testid="button-next"
                disabled={isLoading || !formData.contactFullName || !formData.contactWorkEmail || !formData.contactMobile || !termsAccepted}
                className="flex-1 bg-[#D97706] hover:bg-[#B45309] text-white font-bold py-6 text-lg uppercase tracking-wider rounded-none"
                style={{
                  clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)",
                }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    NEXT
                    <ArrowRight className="w-5 h-5 ml-2" />
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
