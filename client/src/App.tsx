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
import RegisterPage from "@/pages/auth/register";
import ProfilePage from "@/pages/account/profile";

import VendorDashboard from "@/pages/vendor/dashboard";
import VendorProducts from "@/pages/vendor/products";
import VendorOrders from "@/pages/vendor/orders";
import VendorCustomers from "@/pages/vendor/customers";
import VendorAnalytics from "@/pages/vendor/analytics";
import VendorSettings from "@/pages/vendor/settings";

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
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/account/profile" component={ProfilePage} />
      
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
