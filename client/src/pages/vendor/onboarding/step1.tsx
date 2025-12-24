import { useState, useEffect, useRef } from "react";
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
import { Check, ArrowRight, ArrowLeft, Loader2, Upload, ChevronUp, Save } from "lucide-react";
import { api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const countries = [
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "IN", name: "India", flag: "🇮🇳" },
];

const entityTypes = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "retailer", label: "Retailer" },
  { value: "importer", label: "Importer" },
  { value: "exporter", label: "Exporter" },
];

interface UserProfile {
  countryOfRegistration?: string;
  registeredCompanyName?: string;
  tradeBrandName?: string;
  yearOfEstablishment?: number;
  legalEntityId?: string;
  legalEntityIssueDate?: string;
  legalEntityExpiryDate?: string;
  cityOfficeAddress?: string;
  officialWebsite?: string;
  entityType?: string;
  dunsNumber?: string;
  vatCertificateUrl?: string;
  taxVatNumber?: string;
  taxIssuingDate?: string;
  taxExpiryDate?: string;
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

export default function OnboardingStep1Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [vatCertificateUrl, setVatCertificateUrl] = useState("");

  const [formData, setFormData] = useState({
    countryOfRegistration: "AE",
    registeredCompanyName: "",
    tradeBrandName: "",
    yearOfEstablishment: "",
    legalEntityId: "",
    legalEntityIssueDate: "",
    legalEntityExpiryDate: "",
    cityOfficeAddress: "",
    officialWebsite: "",
    entityType: "distributor",
    dunsNumber: "",
    taxVatNumber: "",
    taxIssuingDate: "",
    taxExpiryDate: "",
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
          countryOfRegistration: profile.countryOfRegistration || "AE",
          registeredCompanyName: profile.registeredCompanyName || "",
          tradeBrandName: profile.tradeBrandName || "",
          yearOfEstablishment: profile.yearOfEstablishment?.toString() || "",
          legalEntityId: profile.legalEntityId || "",
          legalEntityIssueDate: profile.legalEntityIssueDate || "",
          legalEntityExpiryDate: profile.legalEntityExpiryDate || "",
          cityOfficeAddress: profile.cityOfficeAddress || "",
          officialWebsite: profile.officialWebsite || "",
          entityType: profile.entityType || "distributor",
          dunsNumber: profile.dunsNumber || "",
          taxVatNumber: profile.taxVatNumber || "",
          taxIssuingDate: profile.taxIssuingDate || "",
          taxExpiryDate: profile.taxExpiryDate || "",
        });
        if (profile.vatCertificateUrl) {
          setVatCertificateUrl(profile.vatCertificateUrl);
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
      setVatCertificateUrl(URL.createObjectURL(file));
    }
  };

  const getFormPayload = () => ({
    ...formData,
    vatCertificateUrl: vatCertificateUrl || null,
  });

  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step1",
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
    setIsLoading(true);

    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step1",
        method: "POST",
        body: getFormPayload(),
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to save company details");
      }

      toast({
        title: "Company Details Saved",
        description: "Moving to authorized contact details...",
      });

      navigate("/vendor/onboarding/step2");
    } catch (error: any) {
      console.error("Step 1 error:", error);
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
        <StepIndicator currentStep={1} />

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
              <Label className="text-[#1C1C1C] font-medium">Country of Registration:</Label>
              <Select
                value={formData.countryOfRegistration}
                onValueChange={(v) => setFormData({ ...formData, countryOfRegistration: v })}
              >
                <SelectTrigger className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] h-12" data-testid="select-country-registration">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{countries.find((c) => c.code === formData.countryOfRegistration)?.flag}</span>
                      <span>{countries.find((c) => c.code === formData.countryOfRegistration)?.name}</span>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Registered Company Name*</Label>
                <Input
                  data-testid="input-registered-company"
                  placeholder="Company LLC"
                  value={formData.registeredCompanyName}
                  onChange={(e) => setFormData({ ...formData, registeredCompanyName: e.target.value })}
                  required
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Trade/Brand Name (if different):</Label>
                <Input
                  data-testid="input-trade-name"
                  placeholder="Brand Name"
                  value={formData.tradeBrandName}
                  onChange={(e) => setFormData({ ...formData, tradeBrandName: e.target.value })}
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Year of Establishment</Label>
                <Input
                  data-testid="input-year-establishment"
                  placeholder="eg : 1985"
                  value={formData.yearOfEstablishment}
                  onChange={(e) => setFormData({ ...formData, yearOfEstablishment: e.target.value })}
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Legal Entity ID / CR No*</Label>
                <Input
                  data-testid="input-legal-entity"
                  placeholder="Enter Your Trade License Number"
                  value={formData.legalEntityId}
                  onChange={(e) => setFormData({ ...formData, legalEntityId: e.target.value })}
                  required
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Issue Date*</Label>
                <Input
                  data-testid="input-issue-date"
                  type="date"
                  placeholder="Enter issue date in the format YYYY-MM-DD"
                  value={formData.legalEntityIssueDate}
                  onChange={(e) => setFormData({ ...formData, legalEntityIssueDate: e.target.value })}
                  required
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Expiry Date</Label>
                <Input
                  data-testid="input-expiry-date"
                  type="date"
                  placeholder="Legal Entity ID / CR No"
                  value={formData.legalEntityExpiryDate}
                  onChange={(e) => setFormData({ ...formData, legalEntityExpiryDate: e.target.value })}
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">City & Office Address</Label>
                <Input
                  data-testid="input-office-address"
                  placeholder="Office Address / Address Line"
                  value={formData.cityOfficeAddress}
                  onChange={(e) => setFormData({ ...formData, cityOfficeAddress: e.target.value })}
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Official Website</Label>
                <Input
                  data-testid="input-website"
                  placeholder="eg: www.company.com"
                  value={formData.officialWebsite}
                  onChange={(e) => setFormData({ ...formData, officialWebsite: e.target.value })}
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">Entity Type</Label>
                <Select
                  value={formData.entityType}
                  onValueChange={(v) => setFormData({ ...formData, entityType: v })}
                >
                  <SelectTrigger className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] h-12" data-testid="select-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((et) => (
                      <SelectItem key={et.value} value={et.value} data-testid={`entity-type-option-${et.value}`}>
                        {et.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1C1C1C] font-medium">DUNS Number (if applicable)</Label>
                <Input
                  data-testid="input-duns"
                  placeholder="eg: 65-432-1987"
                  value={formData.dunsNumber}
                  onChange={(e) => setFormData({ ...formData, dunsNumber: e.target.value })}
                  className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                />
              </div>
            </div>

            <div className="border-t border-[#B8B5A8] pt-6">
              <h3 className="text-lg font-bold text-[#1C1C1C] uppercase tracking-wider mb-4">
                TAX INFORMATION
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#1C1C1C] font-medium">Upload VAT Registration Certificate*</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#D97706] rounded-lg p-6 text-center cursor-pointer hover:bg-[#D97706]/5 transition-colors"
                    data-testid="upload-vat-certificate"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpeg,.jpg,.png,.pdf,.mp4"
                      onChange={handleFileChange}
                      className="hidden"
                      data-testid="input-vat-file"
                    />
                    <Upload className="w-8 h-8 text-[#D97706] mx-auto mb-2" />
                    {uploadedFile ? (
                      <p className="text-[#1C1C1C] font-medium">{uploadedFile.name}</p>
                    ) : vatCertificateUrl ? (
                      <p className="text-[#1C1C1C] font-medium">Certificate uploaded</p>
                    ) : (
                      <>
                        <p className="text-[#1C1C1C] font-medium">Choose a File or Drag & Drop It Here.</p>
                        <p className="text-[#8B8680] text-sm mt-1">
                          Make sure the document details match your entry. Upload all pages in clear, colored format.
                        </p>
                        <p className="text-[#8B8680] text-sm">Accepted files: JPEG, PNG, PDF, or MP4 (max 10 MB).</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[#1C1C1C] font-medium">Tax / VAT Number*</Label>
                    <Input
                      data-testid="input-vat-number"
                      placeholder="eg: 100123456700003"
                      value={formData.taxVatNumber}
                      onChange={(e) => setFormData({ ...formData, taxVatNumber: e.target.value })}
                      required
                      className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#1C1C1C] font-medium">Issuing Date*</Label>
                      <Input
                        data-testid="input-tax-issue-date"
                        type="date"
                        placeholder="Select Issuing Date"
                        value={formData.taxIssuingDate}
                        onChange={(e) => setFormData({ ...formData, taxIssuingDate: e.target.value })}
                        required
                        className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1C1C1C] font-medium">Expiry Date</Label>
                      <Input
                        data-testid="input-tax-expiry-date"
                        type="date"
                        placeholder="Select Expiry Date"
                        value={formData.taxExpiryDate}
                        onChange={(e) => setFormData({ ...formData, taxExpiryDate: e.target.value })}
                        className="bg-[#F5F3EE] border-[#B8B5A8] text-[#1C1C1C] placeholder:text-[#8B8680] h-12"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                data-testid="button-back"
                onClick={() => navigate("/vendor/onboarding/step0")}
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
                disabled={isLoading || !formData.registeredCompanyName || !formData.legalEntityId || !formData.taxVatNumber}
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
