import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AdminOtpDashboard from "./pages/AdminOtpDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import EmployeeSetup from "./pages/EmployeeSetup";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { useIdleLogout } from "./hooks/useIdleLogout";

const queryClient = new QueryClient();

const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
]);

const AppRoutes = () => {
  const location = useLocation();
  const enableIdle = !PUBLIC_ROUTES.has(location.pathname);
  useIdleLogout(enableIdle);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/employee-setup" element={<EmployeeSetup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/admin/otp" element={<AdminOtpDashboard />} />
      <Route path="/admin" element={<SuperAdminDashboard />} />
      <Route path="/manager" element={<ManagerDashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
