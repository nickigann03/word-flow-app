"use client"
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Mic, BookOpen, Layers } from 'lucide-react';

export function LandingPage() {
    const { loginWithGoogle } = useAuth();

    return (
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-blue-500/30">
            {/* Nav */}
            <nav className="border-b border-zinc-800/50 backdrop-blur-md fixed top-0 w-full z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                        <div className="w-6 h-6 bg-white text-black rounded-md flex items-center justify-center text-xs">W</div>
                        WordFlow
                    </div>
                    <button
                        onClick={() => loginWithGoogle()}
                        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Sign In
                    </button>
                </div>
            </nav>

            {/* Hero */}
            <main className="pt-32 pb-16 px-6 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -z-10 opacity-30 pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs font-medium text-zinc-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        v1.0 Public Beta
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                        Theos. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-zinc-200 to-zinc-500">Intelligent Theology.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        A minimalist workspace for sermon preparation.
                        Real-time transcription and deep theological insights, distraction-free.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => loginWithGoogle()}
                            className="h-12 px-8 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-2"
                        >
                            Get Started <ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="h-12 px-8 rounded-full border border-zinc-800 bg-zinc-900/50 text-white font-medium hover:bg-zinc-900 transition-colors">
                            Live Demo
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="max-w-5xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={Mic}
                        title="Live Transcription"
                        desc="Powered by Gladia. Captures every nuance of your speech in real-time."
                    />
                    <FeatureCard
                        icon={BookOpen}
                        title="Theological Context"
                        desc="Instant definitions and cross-references powered by Groq AI models."
                    />
                    <FeatureCard
                        icon={Layers}
                        title="Sermon Frameworks"
                        desc="Structured templates to organize your theological arguments."
                    />
                </div>
            </main>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 transition-all">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
        </div>
    );
}
