import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import PosterGenerator from "./pages/PosterGenerator";
import MetaSettings from "./pages/MetaSettings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserManagement from "./pages/UserManagement";
import FormAssignment from "./pages/FormAssignment";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PermissionGuard from "./components/PermissionGuard";
import ErrorBoundary from "./components/ErrorBoundary";

import CallingLayout from "./layouts/CallingLayout";
import CallingOverview from "./pages/calling/CallingOverview";
import MetaInsights from "./pages/calling/MetaInsights";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Home />} />

                  {/* Calling Dashboard - Requires 'dashboard' permission */}
                  <Route element={<PermissionGuard permission="dashboard" />}>
                    <Route path="/calling" element={<CallingLayout />}>
                      <Route index element={<CallingOverview />} />
                      <Route path="manual" element={<Dashboard key="manual" filterType="manual" />} />
                      <Route path="meta" element={<Dashboard key="meta" filterType="meta" />} />
                      <Route path="insights" element={<MetaInsights />} />

                      {/* Webhook Settings - Requires 'webhooks' permission */}
                      <Route element={<PermissionGuard permission="webhooks" />}>
                        <Route path="webhook" element={<MetaSettings />} />
                      </Route>
                    </Route>
                  </Route>

                  {/* Poster Generator - Requires 'poster' permission */}
                  <Route element={<PermissionGuard permission="poster" />}>
                    <Route path="/poster-generator" element={<PosterGenerator />} />
                  </Route>

                  {/* Admin Only Routes */}
                  <Route element={<PermissionGuard requireAdmin />}>
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/assignments" element={<FormAssignment />} />
                  </Route>

                  <Route path="/whatsapp" element={<WhatsAppSettings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/spreadsheet/:id" element={<Index />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
