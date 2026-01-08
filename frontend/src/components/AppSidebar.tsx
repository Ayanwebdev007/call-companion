import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { Phone, User, LayoutDashboard, LogOut, Home as HomeIcon, ImagePlus, MessageSquare } from "lucide-react";

export function AppSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

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
                        <Phone className="h-5 w-5" />
                    </div>
                    <span className="group-data-[collapsible=icon]:hidden">Call Companion</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu</SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/")}
                                isActive={location.pathname === "/"}
                                tooltip="Overview"
                            >
                                <HomeIcon />
                                <span>Overview</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {hasPermission('dashboard') && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={() => navigate("/calling")}
                                    isActive={location.pathname === "/calling"}
                                    tooltip="Calling Dashboard"
                                >
                                    <LayoutDashboard />
                                    <span>Calling Dashboard</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                        {hasPermission('poster') && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={() => navigate("/poster-generator")}
                                    isActive={location.pathname === "/poster-generator"}
                                    tooltip="Poster Generator"
                                >
                                    <ImagePlus />
                                    <span>Poster Generator</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/whatsapp")}
                                isActive={location.pathname === "/whatsapp"}
                                tooltip="WhatsApp Settings"
                            >
                                <MessageSquare />
                                <span>WhatsApp Settings</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/profile")}
                                isActive={location.pathname === "/profile"}
                                tooltip="Profile"
                            >
                                <User />
                                <span>Profile</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                {user?.role === 'admin' && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Business Admin</SidebarGroupLabel>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={() => navigate("/admin/users")}
                                    isActive={location.pathname === "/admin/users"}
                                    tooltip="User Management"
                                >
                                    <User className="h-4 w-4" />
                                    <span>User Management</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={() => navigate("/admin/assignments")}
                                    isActive={location.pathname === "/admin/assignments"}
                                    tooltip="Form Assignment"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    <span>Form Assignment</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
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
