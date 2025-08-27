import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-600 text-sm text-center py-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-x-4 mb-3">
          <Link href="/about">About</Link>
          <Link href="/faq">FAQs</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div>
          © {new Date().getFullYear()} Global.Church. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}


