import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "bn" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Bengali translations (default)
const bn: Record<string, string> = {
  // Common
  "app.name": "মাইজমেসেজ",
  "app.tagline": "নিরাপদ অভ্যন্তরীণ মেসেজিং প্ল্যাটফর্ম",
  "loading": "লোড হচ্ছে...",
  "error": "ত্রুটি",
  "success": "সফল",
  "confirm": "নিশ্চিত করুন",
  "cancel": "বাতিল",
  "save": "সংরক্ষণ",
  "delete": "মুছুন",
  "edit": "সম্পাদনা",
  "refresh": "রিফ্রেশ",
  "add": "যোগ করুন",
  "new": "নতুন",
  "unknown": "অজানা",
  "no_data": "কোন তথ্য নেই",
  "ok": "ঠিক আছে",
  "wait": "অপেক্ষা করুন...",

  // Auth
  "login": "লগইন",
  "login.title": "লগইন",
  "login.subtitle": "আপনার অ্যাকাউন্টে প্রবেশ করুন",
  "login.button": "লগইন করুন",
  "login.username_or_mobile": "ইউজারনেম বা মোবাইল",
  "login.username_or_mobile_placeholder": "ইউজারনেম অথবা মোবাইল নম্বর",
  "login.password": "পাসওয়ার্ড",
  "login.password_placeholder": "পাসওয়ার্ড দিন",
  "login.register_link": "রেজিস্ট্রেশন করুন",
  "login.otp_link": "OTP ভেরিফাই",
  "login.user_not_found": "ইউজার পাওয়া যায়নি",
  "login.wrong_credentials": "ইউজারনেম/মোবাইল বা পাসওয়ার্ড ভুল",
  "login.account_inactive": "অ্যাকাউন্ট নিষ্ক্রিয়",
  "login.activate_account": "অ্যাডমিনের কাছ থেকে OTP নিয়ে অ্যাকাউন্ট সক্রিয় করুন।",
  "login.server_error": "সার্ভারে সমস্যা",
  "login.instruction": "📢 নির্দেশনা",
  "login.admin_instruction": "অ্যাডমিনের নির্দেশনা",
  "login.username": "ইউজারনেম",
  "login.mobile": "মোবাইল",
  "login.provide_username_or_mobile": "ইউজারনেম বা মোবাইল নম্বর দিন",
  "login.provide_password": "পাসওয়ার্ড দিন",

  // Index
  "index.login": "লগইন করুন",
  "index.register": "রেজিস্ট্রেশন করুন",

  // Dashboard - Navigation
  "nav.tasks": "টাস্ক",
  "nav.messages": "মেসেজ",
  "nav.collection": "কালেকশন",
  "nav.team": "টিম",
  "nav.users": "ইউজার",
  "nav.reports": "রিপোর্ট",
  "nav.location": "লোকেশন",
  "nav.otp": "OTP",
  "nav.dashboard": "ড্যাশবোর্ড",
  "nav.return_main": "মূল ট্যাবে ফিরুন",

  // Roles
  "role.super_admin": "সুপার অ্যাডমিন",
  "role.admin": "অ্যাডমিন",
  "role.manager": "ম্যানেজার প্যানেল",
  "role.member": "মেম্বার",

  // Dashboard stats
  "stats.tasks": "টাস্ক",
  "stats.no_tasks": "কোন টাস্ক নেই",
  "stats.overdue": "ওভারডিউ",
  "stats.messages": "মেসেজ",

  // Collection
  "collection.title": "কালেকশন",
  "collection.new": "নতুন",
  "collection.total": "মোট কালেকশন",
  "collection.today": "আজকের কালেকশন",
  "collection.no_collection": "কোন কালেকশন নেই",
  "collection.add_title": "নতুন কালেকশন",
  "collection.amount": "পরিমাণ (৳)",
  "collection.date": "তারিখ",
  "collection.description_placeholder": "বিবরণ (ঐচ্ছিক)",
  "collection.added": "কালেকশন যোগ হয়েছে",

  // Collection Report
  "collection_report.title": "কালেকশন রিপোর্ট",
  "collection_report.grand_total": "সর্বমোট",
  "collection_report.today": "আজকের",
  "collection_report.this_month": "এই মাসের",
  "collection_report.daily": "দৈনিক",
  "collection_report.monthly": "মাসিক",
  "collection_report.date": "তারিখ",
  "collection_report.amount": "পরিমাণ",
  "collection_report.month": "মাস",
  "collection_report.top15_title": "গত ৩ দিনে সর্বোচ্চ কালেকশন (টপ ১৫)",
  "collection_report.name": "নাম",

  // Reports
  "reports.title": "রিপোর্ট ড্যাশবোর্ড",
  "reports.no_reports": "কোন রিপোর্ট নেই",
  "reports.approve": "অনুমোদন",
  "reports.reject": "বাতিল",
  "reports.retask": "রি-টাস্ক",
  "reports.approve_title": "রিপোর্ট অনুমোদন",
  "reports.reject_title": "রিপোর্ট বাতিল",
  "reports.feedback_placeholder": "মন্তব্য (ঐচ্ছিক)",
  "reports.retask_placeholder": "কী পরিবর্তন করতে হবে...",
  "reports.updated": "রিপোর্ট আপডেট হয়েছে",
  "reports.submitted": "জমা",

  // Status
  "status.pending": "অপেক্ষমাণ",
  "status.approved": "অনুমোদিত",
  "status.not_approved": "অননুমোদিত",
  "status.resubmit": "পুনরায় জমা",

  // User Management
  "permission_denied": "অনুমতি নেই",

  // Logout
  "logout": "লগআউট",
};

// English translations
const en: Record<string, string> = {
  // Common
  "app.name": "MyzMessage",
  "app.tagline": "Secure Internal Messaging Platform",
  "loading": "Loading...",
  "error": "Error",
  "success": "Success",
  "confirm": "Confirm",
  "cancel": "Cancel",
  "save": "Save",
  "delete": "Delete",
  "edit": "Edit",
  "refresh": "Refresh",
  "add": "Add",
  "new": "New",
  "unknown": "Unknown",
  "no_data": "No data",
  "ok": "OK",
  "wait": "Please wait...",

  // Auth
  "login": "Login",
  "login.title": "Login",
  "login.subtitle": "Sign in to your account",
  "login.button": "Sign In",
  "login.username_or_mobile": "Username or Mobile",
  "login.username_or_mobile_placeholder": "Username or mobile number",
  "login.password": "Password",
  "login.password_placeholder": "Enter password",
  "login.register_link": "Register",
  "login.otp_link": "Verify OTP",
  "login.user_not_found": "User not found",
  "login.wrong_credentials": "Wrong username/mobile or password",
  "login.account_inactive": "Account Inactive",
  "login.activate_account": "Get OTP from admin to activate your account.",
  "login.server_error": "Server error",
  "login.instruction": "📢 Notice",
  "login.admin_instruction": "Admin notice",
  "login.username": "Username",
  "login.mobile": "Mobile",
  "login.provide_username_or_mobile": "Enter username or mobile number",
  "login.provide_password": "Enter password",

  // Index
  "index.login": "Login",
  "index.register": "Register",

  // Dashboard - Navigation
  "nav.tasks": "Tasks",
  "nav.messages": "Messages",
  "nav.collection": "Collection",
  "nav.team": "Team",
  "nav.users": "Users",
  "nav.reports": "Reports",
  "nav.location": "Location",
  "nav.otp": "OTP",
  "nav.dashboard": "Dashboard",
  "nav.return_main": "Return to main tab",

  // Roles
  "role.super_admin": "Super Admin",
  "role.admin": "Admin",
  "role.manager": "Manager Panel",
  "role.member": "Member",

  // Dashboard stats
  "stats.tasks": "Tasks",
  "stats.no_tasks": "No tasks",
  "stats.overdue": "Overdue",
  "stats.messages": "Messages",

  // Collection
  "collection.title": "Collection",
  "collection.new": "New",
  "collection.total": "Total Collection",
  "collection.today": "Today's Collection",
  "collection.no_collection": "No collections",
  "collection.add_title": "New Collection",
  "collection.amount": "Amount (৳)",
  "collection.date": "Date",
  "collection.description_placeholder": "Description (optional)",
  "collection.added": "Collection added",

  // Collection Report
  "collection_report.title": "Collection Report",
  "collection_report.grand_total": "Grand Total",
  "collection_report.today": "Today",
  "collection_report.this_month": "This Month",
  "collection_report.daily": "Daily",
  "collection_report.monthly": "Monthly",
  "collection_report.date": "Date",
  "collection_report.amount": "Amount",
  "collection_report.month": "Month",
  "collection_report.top15_title": "Top 15 Collections (Last 3 Days)",
  "collection_report.name": "Name",

  // Reports
  "reports.title": "Report Dashboard",
  "reports.no_reports": "No reports",
  "reports.approve": "Approve",
  "reports.reject": "Reject",
  "reports.retask": "Re-task",
  "reports.approve_title": "Approve Report",
  "reports.reject_title": "Reject Report",
  "reports.feedback_placeholder": "Comment (optional)",
  "reports.retask_placeholder": "What needs to change...",
  "reports.updated": "Report updated",
  "reports.submitted": "Submitted",

  // Status
  "status.pending": "Pending",
  "status.approved": "Approved",
  "status.not_approved": "Not Approved",
  "status.resubmit": "Resubmit",

  // User Management
  "permission_denied": "Permission denied",

  // Logout
  "logout": "Logout",
};

const translations: Record<Language, Record<string, string>> = { bn, en };

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem("app-language") as Language) || "bn";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations["bn"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
