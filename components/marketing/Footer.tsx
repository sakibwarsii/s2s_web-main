import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-white/5 backdrop-blur-xl py-12 px-6 border-t border-white/10 mt-auto relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-inner">
            <Sparkles className="w-3 h-3 text-white/90" />
          </div>
          <span className="text-lg font-semibold text-white/90 tracking-tight drop-shadow-md">Signova</span>
        </div>
        
        <div className="flex gap-6 text-sm text-white/60">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        
        <div className="text-sm text-white/50">
          &copy; {new Date().getFullYear()} Signova Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
