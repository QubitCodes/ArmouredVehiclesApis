export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary text-white p-1 rounded-sm">
                <div className="w-6 h-6 border-2 border-current rounded-sm grid place-items-center">
                  <span className="text-xs font-bold font-display">AP</span>
                </div>
              </div>
              <span className="text-xl font-bold font-display tracking-tight text-white">
                AutoParts<span className="text-primary">.B2B</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              The leading B2B marketplace for automotive parts, connecting verified vendors with workshops and retailers worldwide.
            </p>
          </div>
          
          <div>
            <h4 className="font-display font-bold text-white mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="hover:text-primary transition-colors">Marketplace</a></li>
              <li><a href="/auth/supplier-register" className="hover:text-primary transition-colors" data-testid="link-supplier-register">Become a Supplier</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Vendor Directory</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Bulk Orders</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">API Documentation</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Return Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; 2025 AutoParts Marketplace Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Secured by Stripe</span>
            <span>Verified Vendor Network</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
