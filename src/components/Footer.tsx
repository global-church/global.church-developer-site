import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm">
          <div>
            <h3 className="text-gray-900 font-semibold text-base font-display">Overview</h3>
            <ul className="mt-4 space-y-2 text-gray-700">
              <li><Link className="hover:text-gray-900" href="/">Home</Link></li>
              <li><Link className="hover:text-gray-900" href="/about">About</Link></li>
              <li><Link className="hover:text-gray-900" href="/methodology">Methodology</Link></li>
              <li><Link className="hover:text-gray-900" href="/security-privacy">Security & Privacy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold text-base font-display">Build</h3>
            <ul className="mt-4 space-y-2 text-gray-700">
              <li><Link className="hover:text-gray-900" href="/explorer">Church Explorer</Link></li>
              <li><Link className="hover:text-gray-900" href="/api-docs">API Docs</Link></li>
              <li><Link className="hover:text-gray-900" href="/schema">Schema</Link></li>
              <li><Link className="hover:text-gray-900" href="/mcp-server">MCP Server</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold text-base font-display">Access & Support</h3>
            <ul className="mt-4 space-y-2 text-gray-700">
              <li><Link className="hover:text-gray-900" href="/request-access">Request Access</Link></li>
              <li><Link className="hover:text-gray-900" href="/feedback">Feedback</Link></li>
              <li><Link className="hover:text-gray-900" href="/faq">FAQs</Link></li>
              <li><Link className="hover:text-gray-900" href="/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-gray-900 font-semibold text-base font-display">Developer Site</h3>
            <p className="mt-4 text-gray-700 leading-relaxed">
              Tools, docs, and data standards for the Global.Church API — crafted with the FaithTech community.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
          © 2025 Global.Church. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}
