import { Shield, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold mb-4">
              Income<span className="text-green-400">Lift</span>
            </h3>
            <div className="text-center mb-6">
              <p className="text-gray-400 font-bold text-lg">Bills Don't Wait!</p>
              <p className="text-gray-400 font-bold text-lg mb-4">Neither should Income!</p>
              <p className="text-gray-400 leading-relaxed">
                Track it. Lift it. Grow it. Move from Stability to Growth to Legacy through daily action and clear progress.
              </p>
            </div>
            {/* Security Badges */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-lg">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Bank-Level Security</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-lg">
                <Lock className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Data Encrypted</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="/income/about" className="text-gray-400 hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a 
                  href="https://debttolegacy.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contact
                </a>
              </li>
              <li>
                <a href="/income/reflections" className="text-gray-400 hover:text-white transition-colors">
                  Reflections
                </a>
              </li>
              <li>
                <a href="/income/faq" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a href="/income/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/income/terms-of-use" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="/income/how-to-use" className="text-gray-400 hover:text-white transition-colors">
                  How to Use
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-gray-400">
                © 2025 Debt to Legacy LLC. All rights reserved.
              </p>
            </div>

            {/* Additional Security Badge */}
            <div className="flex items-center space-x-2 text-gray-400">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Your financial data stays private and secure</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


