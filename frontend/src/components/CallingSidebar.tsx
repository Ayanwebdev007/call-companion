import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarFooter,
} from "@/components/ui/sidebar";
import {
    LayoutDashboard,
    FileSpreadsheet,
    Webhook,
    LineChart,
    LogOut,
    ArrowLeft,
    Facebook
} from "lucide-react";

export function CallingSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth(); // Destructuring user here

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions?.includes(permission);
    };

    return (
        <Sidebar collapsible="icon" className="border-r border-border/40 bg-card/50 backdrop-blur-xl">
            <SidebarHeader className="h-16 flex items-center justify-between border-b border-border/40 px-4">
                <div className="flex items-center gap-2 font-bold text-lg text-primary">
                    <div className="bg-primary/10 p-1.5 rounded-lg">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <span className="group-data-[collapsible=icon]:hidden">Calling Dash</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/")}
                                tooltip="Back to Home"
                            >
                                <ArrowLeft />
                                <span>Back to Home</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/calling")}
                                isActive={location.pathname === "/calling"}
                                tooltip="Calling Overview"
                            >
                                <LayoutDashboard />
                                <span>Overview</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/calling/manual")}
                                isActive={location.pathname === "/calling/manual"}
                                tooltip="Manual Spreadsheets"
                            >
                                <FileSpreadsheet />
                                <span>Manual Sheets</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/calling/meta")}
                                isActive={location.pathname === "/calling/meta"}
                                tooltip="Meta Spreadsheets"
                            >
                                <Facebook />
                                <span>Meta Sheets</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        {hasPermission('webhooks') && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={() => navigate("/calling/webhook")}
                                    isActive={location.pathname === "/calling/webhook"}
                                    tooltip="Meta Webhook"
                                >
                                    <Webhook />
                                    <span>Meta Webhook</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/calling/insights")}
                                isActive={location.pathname === "/calling/insights"}
                                tooltip="Meta Insights"
                            >
                                <LineChart />
                                <span>Meta Insights</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-border/40 p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <LogOut />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
