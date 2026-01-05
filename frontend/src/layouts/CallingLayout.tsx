import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { CallingSidebar } from "@/components/CallingSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";

export default function CallingLayout() {
    const { user } = useAuth();

    return (
        <SidebarProvider>
            <CallingSidebar />

            <SidebarInset className="bg-background relative overflow-hidden flex flex-col h-screen">
                {/* Background gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

                <header className="sticky top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 shadow-sm shrink-0">
                    <SidebarTrigger />
                    <div className="flex-1">
                        {/* Breadcrumbs or Title could go here, but for now just spacer */}
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium hidden md:block">{user?.username}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-6 relative z-10 animate-fade-in text-left">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
