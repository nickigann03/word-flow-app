import { ComponentType } from "react";
import { cn } from "@/lib/utils";

export function LoadingScreen() {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100 flex-col gap-4">
            <div className="relative flex h-16 w-16">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20"></span>
                <span className="relative inline-flex rounded-full h-16 w-16 bg-blue-500/10 border-4 border-blue-500 border-t-transparent animate-spin"></span>
            </div>
            <div className="flex flex-col items-center gap-1 animate-pulse">
                <h2 className="text-xl font-bold tracking-tight">Word Flow</h2>
                <p className="text-sm text-zinc-500">Loading ecosystem...</p>
            </div>
        </div>
    );
}

export function LoadingSpinner({ className }: { className?: string }) {
    return (
        <div className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />
    );
}
