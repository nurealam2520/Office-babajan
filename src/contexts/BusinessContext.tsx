import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface Business {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme_color: string;
  is_active: boolean;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businessSlug: string | null;
  isMainApp: boolean;
  allBusinesses: Business[];
  selectedAdminBusiness: Business | null;
  setSelectedAdminBusiness: (b: Business | null) => void;
  getLoginPath: () => string;
  getRegisterPath: () => string;
  getDashboardPath: () => string;
  getAppName: () => string;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const BUSINESS_SLUGS = ["dorbar", "office"];

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [selectedAdminBusiness, setSelectedAdminBusiness] = useState<Business | null>(null);

  // Detect business slug from URL
  const pathParts = location.pathname.split("/").filter(Boolean);
  const businessSlug = BUSINESS_SLUGS.includes(pathParts[0]) ? pathParts[0] : null;
  const isMainApp = !businessSlug;

  const currentBusiness = allBusinesses.find(b => b.slug === businessSlug) || null;

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true);
      if (data) setAllBusinesses(data as Business[]);
    };
    fetchBusinesses();
  }, []);

  const getLoginPath = () => businessSlug ? `/${businessSlug}/login` : "/login";
  const getRegisterPath = () => businessSlug ? `/${businessSlug}/register` : "/register";
  const getDashboardPath = () => businessSlug ? `/${businessSlug}/dashboard` : "/dashboard";

  const getAppName = () => {
    if (currentBusiness) return currentBusiness.name;
    return "Shahzada's Hub";
  };

  return (
    <BusinessContext.Provider value={{
      currentBusiness,
      businessSlug,
      isMainApp,
      allBusinesses,
      selectedAdminBusiness,
      setSelectedAdminBusiness,
      getLoginPath,
      getRegisterPath,
      getDashboardPath,
      getAppName,
    }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusiness must be used within BusinessProvider");
  return context;
};
