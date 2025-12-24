import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check, ArrowRight, ArrowLeft, Loader2, ChevronUp, Save, Upload, X, CreditCard, Building2 } from "lucide-react";
import { api } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface PaymentMethod {
  id: number;
  name: string;
  icon: string | null;
}

interface FinancialInstitution {
  id: number;
  name: string;
  countryCode: string;
  swiftCode: string | null;
}

interface Country {
  id: number;
  code: string;
  name: string;
  flag: string | null;
}

interface ProofType {
  id: number;
  name: string;
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

function FileUpload({
  label,
  required,
  file,
  existingUrl,
  onFileChange,
  onClearUrl,
  testId,
}: {
  label: string;
  required?: boolean;
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
  paymentMethod?: string;
  bankCountry?: string;
  financialInstitution?: string;
  swiftCode?: string;
  bankAccountNumber?: string;
  proofType?: string;
  bankProofUrl?: string;
}

export default function OnboardingStep5Page() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [financialInstitutions, setFinancialInstitutions] = useState<FinancialInstitution[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [proofTypes, setProofTypes] = useState<ProofType[]>([]);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [bankCountry, setBankCountry] = useState("AE");
  const [selectedBank, setSelectedBank] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedProofType, setSelectedProofType] = useState("");
  const [bankProofFile, setBankProofFile] = useState<File | null>(null);
  const [bankProofUrl, setBankProofUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth/supplier-register");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading || !isAuthenticated) return;

      try {
        const [paymentRes, banksRes, countriesRes, proofRes, profileRes] = await Promise.all([
          api<PaymentMethod[]>({ endpoint: "/api/reference/payment-methods", method: "GET" }),
          api<FinancialInstitution[]>({ endpoint: "/api/reference/financial-institutions", method: "GET" }),
          api<Country[]>({ endpoint: "/api/reference/countries", method: "GET" }),
          api<ProofType[]>({ endpoint: "/api/reference/proof-types", method: "GET" }),
          api<{ profile: UserProfile | null }>({ endpoint: "/api/vendor/onboarding/profile", method: "GET", requireAuth: true }),
        ]);

        if (paymentRes.ok && paymentRes.data) setPaymentMethods(paymentRes.data);
        if (banksRes.ok && banksRes.data) setFinancialInstitutions(banksRes.data);
        if (countriesRes.ok && countriesRes.data) setCountries(countriesRes.data);
        if (proofRes.ok && proofRes.data) setProofTypes(proofRes.data);

        if (profileRes.ok && profileRes.data?.profile) {
          const profile = profileRes.data.profile;
          if (profile.paymentMethod) setSelectedPaymentMethod(profile.paymentMethod);
          if (profile.bankCountry) setBankCountry(profile.bankCountry);
          if (profile.financialInstitution) setSelectedBank(profile.financialInstitution);
          if (profile.swiftCode) setSwiftCode(profile.swiftCode);
          if (profile.bankAccountNumber) setAccountNumber(profile.bankAccountNumber);
          if (profile.proofType) setSelectedProofType(profile.proofType);
          if (profile.bankProofUrl) setBankProofUrl(profile.bankProofUrl);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [authLoading, isAuthenticated]);

  const filteredBanks = financialInstitutions.filter((bank) => bank.countryCode === bankCountry);

  const handleBankSelect = (bankName: string) => {
    setSelectedBank(bankName);
    const bank = financialInstitutions.find((b) => b.name === bankName);
    if (bank?.swiftCode) {
      setSwiftCode(bank.swiftCode);
    }
  };

  if (authLoading || isDataLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D97706]" />
      </div>
    );
  }

  const getFormPayload = () => ({
    paymentMethod: selectedPaymentMethod,
    bankCountry,
    financialInstitution: selectedBank,
    swiftCode,
    bankAccountNumber: accountNumber,
    proofType: selectedProofType,
    bankProofUrl: bankProofFile ? URL.createObjectURL(bankProofFile) : bankProofUrl,
  });

  const saveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step5",
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

    if (!selectedPaymentMethod) {
      toast({
        title: "Required Field",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBank) {
      toast({
        title: "Required Field",
        description: "Please select your bank",
        variant: "destructive",
      });
      return;
    }

    if (!accountNumber) {
      toast({
        title: "Required Field",
        description: "Please enter your bank account number",
        variant: "destructive",
      });
      return;
    }

    if (!selectedProofType) {
      toast({
        title: "Required Field",
        description: "Please select a proof type",
        variant: "destructive",
      });
      return;
    }

    if (!bankProofFile && !bankProofUrl) {
      toast({
        title: "Required Field",
        description: "Please upload bank proof document",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await api({
        endpoint: "/api/vendor/onboarding/step5",
        method: "POST",
        body: getFormPayload(),
        requireAuth: true,
      });

      if (!response.ok) {
        throw new Error(response.error || "Failed to save bank details");
      }

      toast({
        title: "Bank Details Saved",
        description: "Moving to identity verification...",
      });

      navigate("/vendor/onboarding/identity-verification");
    } catch (error: any) {
      console.error("Step 5 error:", error);
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

  const getPaymentIcon = (iconName: string | null) => {
    switch (iconName) {
      case "credit-card":
        return <CreditCard className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={5} />

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
              <h3 className="text-[#1C1C1C] font-medium text-lg">
                Receive Payment
              </h3>
              <p className="text-sm text-gray-500">
                Select how you would like to receive payments from ArmoredMart
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method.name)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      selectedPaymentMethod === method.name
                        ? "border-[#D97706] bg-[#FEF3E2]"
                        : "border-gray-200 bg-white hover:border-[#D97706]"
                    }`}
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {getPaymentIcon(method.icon)}
                      <span className="text-sm font-medium text-gray-700">{method.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-6 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-[#1C1C1C] font-medium">
                <Building2 className="w-5 h-5" />
                Bank Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1C1C1C] font-medium">Bank Country*</Label>
                  <select
                    value={bankCountry}
                    onChange={(e) => {
                      setBankCountry(e.target.value);
                      setSelectedBank("");
                      setSwiftCode("");
                    }}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-700"
                    data-testid="select-bank-country"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#1C1C1C] font-medium">Financial Institution*</Label>
                  <select
                    value={selectedBank}
                    onChange={(e) => handleBankSelect(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-700"
                    data-testid="select-bank"
                  >
                    <option value="">Select your bank</option>
                    {filteredBanks.map((bank) => (
                      <option key={bank.id} value={bank.name}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#1C1C1C] font-medium">SWIFT / BIC Code</Label>
                  <Input
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                    placeholder="e.g., BOMLAEAD"
                    className="bg-white border-gray-300"
                    data-testid="input-swift-code"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#1C1C1C] font-medium">Bank Account Number / IBAN*</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    className="bg-white border-gray-300"
                    data-testid="input-account-number"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[#1C1C1C] font-medium text-lg">
                Bank Account Proof*
              </h3>
              <p className="text-sm text-gray-500">
                Upload a document to verify your bank account ownership
              </p>

              <RadioGroup
                value={selectedProofType}
                onValueChange={setSelectedProofType}
                className="flex flex-wrap gap-4"
                data-testid="radio-group-proof-type"
              >
                {proofTypes.map((proof) => (
                  <div key={proof.id} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={proof.name}
                      id={`proof-${proof.id}`}
                      className="border-gray-400 text-[#D97706]"
                      data-testid={`radio-proof-${proof.id}`}
                    />
                    <Label
                      htmlFor={`proof-${proof.id}`}
                      className="text-gray-700 cursor-pointer"
                    >
                      {proof.name}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <FileUpload
                label="Upload Bank Proof Document"
                required
                file={bankProofFile}
                existingUrl={bankProofUrl}
                onFileChange={setBankProofFile}
                onClearUrl={() => setBankProofUrl(null)}
                testId="upload-bank-proof"
              />
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/vendor/onboarding/step4")}
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
