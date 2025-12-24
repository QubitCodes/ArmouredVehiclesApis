import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ArrowRight, ArrowLeft, Loader2, Upload, ChevronUp, X, Search, Save } from "lucide-react";
import { api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ReferenceItem {
  id: number;
  name: string;
}

interface Country {
  id: number;
  code: string;
  name: string;
  flag: string | null;
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

function MultiSelectChips({
  label,
  options,
  selected,
  onChange,
  required,
}: {
  label: string;
  options: ReferenceItem[];
  selected: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
}) {
  const toggleOption = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-[#1C1C1C] font-medium">
        {label}
        {required && "*"}
      </Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => toggleOption(option.name)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selected.includes(option.name)
                ? "bg-[#D97706] text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:border-[#D97706]"
            }`}
            data-testid={`chip-${option.name.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function CountryMultiSelect({
  countries,
  selected,
  onChange,
}: {
  countries: Country[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCountry = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((s) => s !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const removeCountry = (code: string) => {
    onChange(selected.filter((s) => s !== code));
  };

  return (
    <div className="space-y-3">
      <Label className="text-[#1C1C1C] font-medium">
        Countries you operate in / export to
      </Label>
      <div className="relative">
        <div
          className="min-h-[48px] p-2 bg-white border border-gray-300 rounded-lg cursor-pointer flex flex-wrap gap-2"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="select-countries-trigger"
        >
          {selected.length === 0 ? (
            <span className="text-gray-400 py-1">Select countries...</span>
          ) : (
            selected.map((code) => {
              const country = countries.find((c) => c.code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[#FEF3E2] text-[#D97706] rounded-full text-sm"
                  data-testid={`selected-country-${code.toLowerCase()}`}
                >
                  {country?.flag} {country?.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCountry(code);
                    }}
                    className="hover:text-[#B45309]"
                    data-testid={`remove-country-${code.toLowerCase()}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto" data-testid="countries-dropdown">
            <div className="sticky top-0 bg-white p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search countries..."
                  className="pl-9"
                  onClick={(e) => e.stopPropagation()}
                  data-testid="input-search-countries"
                />
              </div>
            </div>
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCountry(country.code);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                  selected.includes(country.code) ? "bg-[#FEF3E2]" : ""
                }`}
                data-testid={`country-option-${country.code.toLowerCase()}`}
              >
                <span>{country.flag}</span>
                <span>{country.name}</span>
                {selected.includes(country.code) && (
                  <Check className="w-4 h-4 text-[#D97706] ml-auto" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileUpload({
  label,
  required,
  recommended,
  file,
  existingUrl,
  onFileChange,
  onClearUrl,
  testId,
}: {
  label: string;
  required?: boolean;
  recommended?: boolean;
  file: File | null;
  existingUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onClearUrl?: () => void;
  testId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("Maximum file size is 10 MB");
        return;
      }
      onFileChange(selectedFile);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileChange(null);
    if (onClearUrl) {
      onClearUrl();
    }
  };

  const hasFile = file !== null;
  const hasExistingUpload = existingUrl !== null && existingUrl !== undefined && existingUrl !== "";

  return (
    <div className="space-y-2">
      <Label className="text-[#1C1C1C] font-medium flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {recommended && (
          <span className="text-xs text-gray-500">(Recommended)</span>
        )}
      </Label>
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#D97706] transition-colors bg-white"
        onClick={() => fileInputRef.current?.click()}
        data-testid={testId}
      >
        {hasFile ? (
          <div className="flex items-center justify-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-gray-700">{file.name}</span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-500 hover:text-red-700"
              data-testid={`${testId}-remove`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : hasExistingUpload ? (
          <div className="flex items-center justify-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span className="text-gray-700">Document already uploaded</span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-500 hover:text-red-700 ml-2"
              data-testid={`${testId}-remove`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-[#D97706] mx-auto mb-2" />
            <p className="text-gray-600 text-sm">
              Choose a File or Drag & Drop It Here.
            </p>
            <p className="text-gray-400 text-xs mt-1">
              JPEG, PNG, PDF formats, up to 10 MB.
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

interface UserProfile {
  natureOfBusiness?: string[];
  controlledDualUseItems?: string;
  licenseTypes?: string[];
  endUseMarkets?: string[];
  operatingCountries?: string[];
  isOnSanctionsList?: boolean;
  businessLicenseUrl?: string;
  defenseApprovalUrl?: string;
  companyProfileUrl?: string;
  complianceTermsAccepted?: boolean;
}

export default function OnboardingStep3Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [natureOfBusinessOptions, setNatureOfBusinessOptions] = useState<ReferenceItem[]>([]);
  const [endUseMarketOptions, setEndUseMarketOptions] = useState<ReferenceItem[]>([]);
  const [licenseTypeOptions, setLicenseTypeOptions] = useState<ReferenceItem[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

  const [selectedNatureOfBusiness, setSelectedNatureOfBusiness] = useState<string[]>([]);
  const [controlledDualUseItems, setControlledDualUseItems] = useState("");
  const [selectedLicenseTypes, setSelectedLicenseTypes] = useState<string[]>([]);
  const [selectedEndUseMarkets, setSelectedEndUseMarkets] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [isOnSanctionsList, setIsOnSanctionsList] = useState<boolean | null>(null);

  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [defenseApprovalFile, setDefenseApprovalFile] = useState<File | null>(null);
  const [companyProfileFile, setCompanyProfileFile] = useState<File | null>(null);

  const [businessLicenseUrl, setBusinessLicenseUrl] = useState<string | null>(null);
  const [defenseApprovalUrl, setDefenseApprovalUrl] = useState<string | null>(null);
  const [companyProfileUrl, setCompanyProfileUrl] = useState<string | null>(null);

  const [complianceTermsAccepted, setComplianceTermsAccepted] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth/supplier-register");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !isAuthenticated) return;
      
      try {
        const [nobRes, marketsRes, licensesRes, countriesRes, profileRes] = await Promise.all([
          api<ReferenceItem[]>({ endpoint: "/api/reference/nature-of-business", method: "GET" }),
          api<ReferenceItem[]>({ endpoint: "/api/reference/end-use-markets", method: "GET" }),
          api<ReferenceItem[]>({ endpoint: "/api/reference/license-types", method: "GET" }),
          api<Country[]>({ endpoint: "/api/reference/countries", method: "GET" }),
          api<{ profile: UserProfile | null }>({ endpoint: "/api/vendor/onboarding/profile", method: "GET", requireAuth: true }),
        ]);

        if (nobRes.ok && nobRes.data) setNatureOfBusinessOptions(nobRes.data);
        if (marketsRes.ok && marketsRes.data) setEndUseMarketOptions(marketsRes.data);
        if (licensesRes.ok && licensesRes.data) setLicenseTypeOptions(licensesRes.data);
        if (countriesRes.ok && countriesRes.data) setCountries(countriesRes.data);

        if (profileRes.ok && profileRes.data?.profile) {
          const profile = profileRes.data.profile;
          if (profile.natureOfBusiness) setSelectedNatureOfBusiness(profile.natureOfBusiness);
          if (profile.controlledDualUseItems) setControlledDualUseItems(profile.controlledDualUseItems);
          if (profile.licenseTypes) setSelectedLicenseTypes(profile.licenseTypes);
          if (profile.endUseMarkets) setSelectedEndUseMarkets(profile.endUseMarkets);
          if (profile.operatingCountries) setSelectedCountries(profile.operatingCountries);
          if (profile.isOnSanctionsList !== undefined) setIsOnSanctionsList(profile.isOnSanctionsList);
          if (profile.complianceTermsAccepted) setComplianceTermsAccepted(profile.complianceTermsAccepted);
          if (profile.businessLicenseUrl) setBusinessLicenseUrl(profile.businessLicenseUrl);
          if (profile.defenseApprovalUrl) setDefenseApprovalUrl(profile.defenseApprovalUrl);
          if (profile.companyProfileUrl) setCompanyProfileUrl(profile.companyProfileUrl);
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

  const getFormPayload = () => ({
    natureOfBusiness: selectedNatureOfBusiness,
    controlledDualUseItems,
    licenseTypes: selectedLicenseTypes,
    endUseMarkets: selectedEndUseMarkets,
    operatingCountries: selectedCountries,
    isOnSanctionsList,
    businessLicenseUrl: businessLicenseFile ? URL.createObjectURL(businessLicenseFile) : businessLicenseUrl,
    defenseApprovalUrl: defenseApprovalFile ? URL.createObjectURL(defenseApprovalFile) : defenseApprovalUrl,
    companyProfileUrl: companyProfileFile ? URL.createObjectURL(companyProfileFile) : companyProfileUrl,
    complianceTermsAccepted,
  });

  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step3",
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

    if (selectedNatureOfBusiness.length === 0) {
      toast({
        title: "Required Field",
        description: "Please select at least one nature of business",
        variant: "destructive",
      });
      return;
    }

    if (selectedEndUseMarkets.length === 0) {
      toast({
        title: "Required Field",
        description: "Please select at least one end-use market",
        variant: "destructive",
      });
      return;
    }

    if (!businessLicenseFile && !businessLicenseUrl) {
      toast({
        title: "Required Field",
        description: "Please upload your business license",
        variant: "destructive",
      });
      return;
    }

    if (isOnSanctionsList === null) {
      toast({
        title: "Required Field",
        description: "Please answer the sanctions/watchlist question",
        variant: "destructive",
      });
      return;
    }

    if (!complianceTermsAccepted) {
      toast({
        title: "Confirmation Required",
        description: "Please accept the compliance terms",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step3",
        method: "POST",
        body: getFormPayload(),
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to save business & compliance details");
      }

      toast({
        title: "Business & Compliance Saved",
        description: "Moving to the next step...",
      });

      navigate("/vendor/onboarding/step4");
    } catch (error: any) {
      console.error("Step 3 error:", error);
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
        <StepIndicator currentStep={3} />

        <Card className="bg-[#F5F3EE] border-none shadow-none p-8 relative">
          <button
            onClick={scrollToTop}
            className="absolute top-4 right-4 w-8 h-8 bg-[#D97706] text-white rounded flex items-center justify-center hover:bg-[#B45309] transition-colors"
            data-testid="button-scroll-to-top"
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="space-y-8">
            <MultiSelectChips
              label="Nature of Business"
              options={natureOfBusinessOptions}
              selected={selectedNatureOfBusiness}
              onChange={setSelectedNatureOfBusiness}
              required
            />

            <div className="space-y-2">
              <Label className="text-[#1C1C1C] font-medium">
                Do you handle any controlled / dual-use items?
              </Label>
              <Input
                data-testid="input-controlled-items"
                placeholder="Type controlled / dual-use items"
                value={controlledDualUseItems}
                onChange={(e) => setControlledDualUseItems(e.target.value)}
                className="bg-white border-gray-300 text-[#1C1C1C] placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[#1C1C1C] font-medium">Licenses Held</Label>
              <RadioGroup
                value={selectedLicenseTypes[0] || ""}
                onValueChange={(value) => setSelectedLicenseTypes([value])}
                className="flex flex-wrap gap-4"
                data-testid="radio-group-licenses"
              >
                {licenseTypeOptions.map((license) => (
                  <div key={license.id} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={license.name}
                      id={`license-${license.id}`}
                      className="border-gray-400 text-[#D97706]"
                      data-testid={`radio-license-${license.name.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <Label
                      htmlFor={`license-${license.id}`}
                      className="text-gray-700 cursor-pointer"
                    >
                      {license.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <MultiSelectChips
              label="End-Use Market"
              options={endUseMarketOptions}
              selected={selectedEndUseMarkets}
              onChange={setSelectedEndUseMarkets}
              required
            />

            <CountryMultiSelect
              countries={countries}
              selected={selectedCountries}
              onChange={setSelectedCountries}
            />

            <div className="space-y-3">
              <Label className="text-[#1C1C1C] font-medium">
                Are you or your company on any government sanctions or watchlists?*
              </Label>
              <RadioGroup
                value={isOnSanctionsList === null ? "" : isOnSanctionsList ? "yes" : "no"}
                onValueChange={(value) => setIsOnSanctionsList(value === "yes")}
                className="flex gap-6"
                data-testid="radio-group-sanctions"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="yes"
                    id="sanctions-yes"
                    className="border-gray-400 text-[#D97706]"
                    data-testid="radio-sanctions-yes"
                  />
                  <Label htmlFor="sanctions-yes" className="text-gray-700 cursor-pointer">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="no"
                    id="sanctions-no"
                    className="border-gray-400 text-[#D97706]"
                    data-testid="radio-sanctions-no"
                  />
                  <Label htmlFor="sanctions-no" className="text-gray-700 cursor-pointer">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-semibold text-[#1C1C1C] mb-6">
                Document Uploads
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FileUpload
                  label="Upload Business License"
                  required
                  file={businessLicenseFile}
                  existingUrl={businessLicenseUrl}
                  onFileChange={setBusinessLicenseFile}
                  onClearUrl={() => setBusinessLicenseUrl(null)}
                  testId="upload-business-license"
                />
                <FileUpload
                  label="Upload Defense-Related Approval"
                  file={defenseApprovalFile}
                  existingUrl={defenseApprovalUrl}
                  onFileChange={setDefenseApprovalFile}
                  onClearUrl={() => setDefenseApprovalUrl(null)}
                  testId="upload-defense-approval"
                />
                <FileUpload
                  label="Upload Company Profile / Product Catalog"
                  recommended
                  file={companyProfileFile}
                  existingUrl={companyProfileUrl}
                  onFileChange={setCompanyProfileFile}
                  onClearUrl={() => setCompanyProfileUrl(null)}
                  testId="upload-company-profile"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="compliance-terms"
                  checked={complianceTermsAccepted}
                  onCheckedChange={(checked) =>
                    setComplianceTermsAccepted(checked === true)
                  }
                  className="mt-1 border-gray-400 data-[state=checked]:bg-[#D97706] data-[state=checked]:border-[#D97706]"
                  data-testid="checkbox-compliance-terms"
                />
                <Label
                  htmlFor="compliance-terms"
                  className="text-sm text-gray-600 leading-relaxed cursor-pointer"
                >
                  I certify that the information provided is accurate and complete. I
                  understand that false declarations may result in account suspension
                  and legal action. I agree to comply with all applicable export
                  control laws and regulations.
                </Label>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/vendor/onboarding/step2")}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="button"
                data-testid="button-save-draft"
                onClick={saveDraft}
                disabled={isSavingDraft}
                variant="outline"
                className="border-[#D97706] text-[#D97706] hover:bg-[#FEF3E2]"
              >
                {isSavingDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#D97706] hover:bg-[#B45309] text-white px-8"
                data-testid="button-continue"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
