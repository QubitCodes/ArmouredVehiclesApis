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
import LoginPage from "@/pages/auth/user-login";
import RegisterPage from "@/pages/auth/register";
import SellerDashboard from "@/pages/seller/dashboard";
import ProfilePage from "@/pages/account/profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={ProductsPage} />
      <Route path="/products/:id" component={ProductDetailsPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/seller/dashboard" component={SellerDashboard} />
      <Route path="/account/profile" component={ProfilePage} />
      
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
