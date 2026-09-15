import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-6xl z-50 flex items-center justify-between px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 border-t-white/20 rounded-full shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <Link href="/" className="text-xl font-semibold text-white tracking-tight drop-shadow-md">
          Signova
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
        <Link href="#features" className="hover:text-white transition-colors drop-shadow-sm">Features</Link>
      </div>

      <div className="flex items-center gap-6">
        <Link href="/classroom">
          <button className="px-5 py-2 text-sm font-semibold bg-white text-black hover:scale-[1.02] active:scale-[0.98] transition-all rounded-full shadow-lg shadow-white/20">
            Try the Demo
          </button>
        </Link>
      </div>
    </nav>
  );
}
