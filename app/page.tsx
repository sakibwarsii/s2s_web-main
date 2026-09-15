"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Volume2, Sparkles, BrainCircuit, Globe } from "lucide-react";
import Navbar from "../components/marketing/Navbar";
import Footer from "../components/marketing/Footer";
import { Button } from "../components/ui/Button";

export default function MarketingHome() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white font-sans selection:bg-white/20">
      <Navbar />

            <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-20 sm:pt-32 sm:pb-32 px-4 sm:px-6">
          
          <motion.div 
            className="max-w-5xl mx-auto text-center relative z-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 text-white/90 text-xs sm:text-sm font-medium mb-6 sm:mb-8 backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80" />
              <span>Next-Gen Educational Accessibility</span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-3xl sm:text-5xl md:text-7xl font-semibold tracking-tight mb-6 sm:mb-8 leading-tight text-white/90 drop-shadow-lg">
              Bridge the Gap with <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">
                Real-Time Sign Language
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-sm sm:text-lg md:text-xl text-white/70 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed drop-shadow-sm px-2">
              Empower your classroom with our enterprise-grade Speech-to-Sign translation platform. Convert live lectures into smooth, physics-based 3D sign language avatars instantly.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/classroom">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-lg px-8 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white hover:scale-110 hover:-translate-y-2 active:scale-95 transition-all duration-300 shadow-xl shadow-indigo-500/50 hover:shadow-indigo-500/80 border-0">
                  Try the Demo <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 border-white/20 bg-white/5 text-white/90 backdrop-blur-md hover:bg-white/10 transition-all shadow-inner">
                  See how it works
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 bg-transparent relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold tracking-tight mb-4 text-white/90 drop-shadow-md">Powered by Advanced Tech</h2>
              <p className="text-white/60 max-w-2xl mx-auto">Our platform combines state-of-the-art processing with rigorous rendering technologies to deliver an unparalleled accessibility experience.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<Volume2 className="w-6 h-6 text-slate-300" />}
                title="Real-Time STT"
                description="Lightning-fast Speech-to-Text conversion using local Vosk GPU acceleration for sub-500ms latency."
              />
              <FeatureCard 
                icon={<BrainCircuit className="w-6 h-6 text-slate-300" />}
                title="Smart NLP Pipeline"
                description="Powered by Groq's LLMs and SpaCy to intelligently clean speech and translate text to signs without losing context."
              />
              <FeatureCard 
                icon={<Globe className="w-6 h-6 text-slate-300" />}
                title="3D Avatar Rendering"
                description="Smooth, realistic sign language animation generated instantly via the CWASA WebGL engine."
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white/10 backdrop-blur-3xl border border-white/20 border-t-white/30 border-l-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:bg-white/10 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/40 to-purple-500/40 border border-white/40 shadow-[inset_0_2px_10px_rgba(255,255,255,0.3)] flex items-center justify-center mb-6 shadow-inner">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-3 text-white/90 tracking-tight drop-shadow-sm">{title}</h3>
      <p className="text-white/70 leading-relaxed text-sm">{description}</p>
    </div>
  );
}


