import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BusinessProvider } from "@/contexts/BusinessContext";
import Index from "./pages/Index";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminOtpDashboard from "./pages/AdminOtpDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import NotFound from "./pages/NotFound";
import BusinessIndex from "./pages/BusinessIndex";
import BusinessLogin from "./pages/BusinessLogin";
import BusinessRegister from "./pages/BusinessRegister";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <BusinessProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/otp" element={<AdminOtpDashboard />} />
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="/manager" element={<ManagerDashboard />} />

            <Route path="/dorbar" element={<BusinessIndex />} />
            <Route path="/dorbar/login" element={<BusinessLogin />} />
            <Route path="/dorbar/register" element={<BusinessRegister />} />
            <Route path="/dorbar/verify-otp" element={<VerifyOtp />} />
            <Route path="/dorbar/dashboard" element={<Dashboard />} />

            <Route path="/office" element={<BusinessIndex />} />
            <Route path="/office/login" element={<BusinessLogin />} />
            <Route path="/office/register" element={<BusinessRegister />} />
            <Route path="/office/verify-otp" element={<VerifyOtp />} />
            <Route path="/office/dashboard" element={<Dashboard />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BusinessProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
