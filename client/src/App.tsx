import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import ProductsPage from "@/pages/products";
import ProductDetailsPage from "@/pages/product-details";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import CheckoutSuccessPage from "@/pages/checkout-success";
import WishlistPage from "@/pages/account/wishlist";
import OrderTrackingPage from "@/pages/account/order-tracking";
import OrderDetailsPage from "@/pages/account/order-details";
import RefundDetailsPage from "@/pages/account/refund-details";
import UserProfilePage from "@/pages/account/user-profile";
import LoginPage from "@/pages/auth/user-login";
import OtpLoginPage from "@/pages/auth/otp-login";
import RegisterPage from "@/pages/auth/register";
import SupplierRegisterPage from "@/pages/auth/supplier-register";
import VerifyEmailPage from "@/pages/auth/verify-email";
import AddPhonePage from "@/pages/auth/add-phone";
import VerifyPhonePage from "@/pages/auth/verify-phone";
import ProfilePage from "@/pages/account/profile";

import VendorDashboard from "@/pages/vendor/dashboard";
import VendorProducts from "@/pages/vendor/products";
import VendorOrders from "@/pages/vendor/orders";
import VendorCustomers from "@/pages/vendor/customers";
import VendorAnalytics from "@/pages/vendor/analytics";
import VendorSettings from "@/pages/vendor/settings";
import OnboardingStep0 from "@/pages/vendor/onboarding/step0";
import OnboardingStep1 from "@/pages/vendor/onboarding/step1";
import OnboardingStep2 from "@/pages/vendor/onboarding/step2";
import OnboardingStep3 from "@/pages/vendor/onboarding/step3";
import OnboardingStep4 from "@/pages/vendor/onboarding/step4";
import OnboardingStep5 from "@/pages/vendor/onboarding/step5";
import IdentityVerification from "@/pages/vendor/onboarding/identity-verification";
import SupplierZonePage from "@/pages/vendor/supplier-zone";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/:id" component={ProductDetailsPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/checkout/success" component={CheckoutSuccessPage} />
      <Route path="/account/wishlist" component={WishlistPage} />
      <Route path="/account/orders/:id/track" component={OrderTrackingPage} />
      <Route path="/account/orders/:id/details" component={OrderDetailsPage} />
      <Route path="/account/refunds/:id" component={RefundDetailsPage} />
      <Route path="/account/profile/edit" component={UserProfilePage} />
      <Route path="/auth/login" component={OtpLoginPage} />
      <Route path="/auth/login-password" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/auth/supplier-register" component={SupplierRegisterPage} />
      <Route path="/auth/verify-email" component={VerifyEmailPage} />
      <Route path="/auth/add-phone" component={AddPhonePage} />
      <Route path="/auth/verify-phone" component={VerifyPhonePage} />
      <Route path="/account/profile" component={ProfilePage} />
      
      {/* Vendor Onboarding Routes */}
      <Route path="/vendor/supplier-zone" component={SupplierZonePage} />
      <Route path="/vendor/onboarding/step0" component={OnboardingStep0} />
      <Route path="/vendor/onboarding/step1" component={OnboardingStep1} />
      <Route path="/vendor/onboarding/step2" component={OnboardingStep2} />
      <Route path="/vendor/onboarding/step3" component={OnboardingStep3} />
      <Route path="/vendor/onboarding/step4" component={OnboardingStep4} />
      <Route path="/vendor/onboarding/step5" component={OnboardingStep5} />
      <Route path="/vendor/onboarding/identity-verification" component={IdentityVerification} />
      
      {/* Vendor Routes */}
      <Route path="/vendor/dashboard" component={VendorDashboard} />
      <Route path="/vendor/products" component={VendorProducts} />
      <Route path="/vendor/orders" component={VendorOrders} />
      <Route path="/vendor/customers" component={VendorCustomers} />
      <Route path="/vendor/analytics" component={VendorAnalytics} />
      <Route path="/vendor/settings" component={VendorSettings} />
      <Route path="/seller/dashboard" component={VendorDashboard} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
