"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserCheck,
  Trophy,
  Send,
  CreditCard,
  Sliders,
  LogOut,
  Bell,
  Menu,
  X,
  Globe,
  BarChart3,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Search,
  FileArchive,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/admin/command-palette";
import { motion, AnimatePresence } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [userProfile, setUserProfile] = React.useState<{ full_name: string; email: string } | null>(null);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const supabase = createClient();

  useBodyScrollLock(mobileMenuOpen);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      const activeTheme = isDark ? "dark" : "light";
      const saved = localStorage.getItem("smuct-admin-sidebar-collapsed");
      const frameId = requestAnimationFrame(() => {
        setTheme(activeTheme);
        if (saved === "true") {
          setIsCollapsed(true);
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, []);

  React.useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!userData || userData.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      // Fetch user profile details for sidebar display
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setUserProfile({
        full_name: profile?.full_name || "Admin User",
        email: user.email || "admin@smuct.edu.bd",
      });
      setIsAdmin(true);
    }

    checkAdmin();
  }, [supabase, router]);

  const toggleTheme = () => {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("smuct-admin-sidebar-collapsed", String(nextState));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Registrations", href: "/admin/registrations", icon: Users },
    { label: "Competitions", href: "/admin/competitions", icon: Trophy },
    { label: "Submissions", href: "/admin/submissions", icon: Send },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Judging", href: "/admin/judging", icon: Sliders },
    { label: "CMS Content", href: "/admin/cms", icon: Globe },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Exports", href: "/admin/exports", icon: FileArchive },
  ];

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-sans" suppressHydrationWarning>
        <div className="space-y-4 text-center animate-pulse" suppressHydrationWarning>
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" suppressHydrationWarning />
          <p className="text-sm text-muted-foreground font-mono" suppressHydrationWarning>Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans bg-background text-foreground min-h-screen flex w-full overflow-x-hidden relative">
      {/* Background ambient glowing orbs (extremely low opacity to maintain depth without cluttering the light crm style) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/2 dark:bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-secondary/2 dark:bg-secondary/8 rounded-full blur-[130px] pointer-events-none z-0" />
      
      <CommandPalette />

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border shadow-sm transition-all duration-300 z-20 ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        {/* Brand */}
        <div
          className={`flex h-16 items-center border-b border-sidebar-border gap-3 transition-all duration-300 ${
            isCollapsed ? "justify-center" : "px-6 justify-between"
          }`}
        >
          {!isCollapsed ? (
            <>
              <div className="relative h-10 w-10 flex items-center">
                <Image
                  src="/festlogo.png"
                  alt="SMUCT CSE Fest '26 Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain dark:hidden"
                />
                <Image
                  src="/festlogo.png"
                  alt="SMUCT CSE Fest '26 Dark Logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain hidden dark:block"
                />
              </div>
              <span className="font-heading font-bold text-sm tracking-widest text-primary border-l border-sidebar-border pl-3">
                ADMIN
              </span>
            </>
          ) : (
            <span
              className="font-heading font-bold text-sm text-primary tracking-wider font-mono bg-background px-2 py-1 rounded-sm border border-sidebar-border"
              title="SMUCT CSE Fest '26 Admin"
            >
              AD
            </span>
          )}
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-fast ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground"}`} />
                {!isCollapsed && <span className="animate-fade-in">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Collapse Toggle */}
        <div className="px-2 py-2 border-t border-sidebar-border">
          <button
            onClick={toggleSidebar}
            className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>

        {/* Profile Card / User Section */}
        <div className="p-4 border-t border-sidebar-border">
          {isCollapsed ? (
            <button
              onClick={handleLogout}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-sidebar-foreground mx-auto"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 shrink-0 hover:text-error" />
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  {userProfile?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AD"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-sidebar-foreground truncate" title={userProfile?.full_name}>
                    {userProfile?.full_name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate" title={userProfile?.email}>
                    {userProfile?.email}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full gap-2 justify-start h-8 px-2 text-xs text-sidebar-foreground hover:text-error hover:bg-error/10 hover:border-transparent rounded border-transparent"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 z-10 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-8 z-30 sticky top-0">
          <div className="lg:hidden flex items-center gap-3">
            <div className="relative h-10 w-10">
              <Image
                src="/festlogo.png"
                alt="SMUCT CSE Fest '26 Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain dark:hidden"
              />
              <Image
                src="/festlogo.png"
                alt="SMUCT CSE Fest '26 Dark Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain hidden dark:block"
              />
            </div>
            <span className="font-heading font-bold text-xs tracking-widest text-primary border-l border-border pl-3">
              ADMIN
            </span>
          </div>
          
          {/* Header Search Bar (matching Sales CRM design) */}
          <div className="hidden lg:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search verifications, payments, teams..."
              className="w-full h-10 pl-10 pr-4 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-foreground"
            />
          </div>

          {/* Right Header Controls & Mobile Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-muted text-sidebar-foreground border-transparent cursor-pointer"
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="h-4.5 w-4.5" />
              ) : (
                <Sun className="h-4.5 w-4.5" />
              )}
            </button>
            <button className="relative h-10 w-10 flex items-center justify-center rounded-md hover:bg-muted text-sidebar-foreground cursor-pointer">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-primary text-primary-foreground text-sm font-bold rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            <button
              className="lg:hidden p-2 rounded-full border border-border hover:bg-muted text-sidebar-foreground cursor-pointer"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* Inner page content wrapper */}
        <main className="grow p-4 md:p-8 w-full min-w-0 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
          <div className="relative flex flex-col w-64 max-w-xs bg-sidebar border-r border-sidebar-border p-4 space-y-6 animate-fade-in h-full">
            <div className="flex justify-between items-center pb-4 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <Image
                    src="/festlogo.png"
                    alt="SMUCT CSE Fest '26 Logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain dark:hidden"
                  />
                  <Image
                    src="/festlogo.png"
                    alt="SMUCT CSE Fest '26 Dark Logo"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain hidden dark:block"
                  />
                </div>
                <span className="font-heading font-bold text-xs tracking-widest text-primary border-l border-sidebar-border pl-3">
                  ADMIN
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-full text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="grow space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  {userProfile?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AD"}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-sidebar-foreground truncate">
                    {userProfile?.full_name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {userProfile?.email}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full gap-3 justify-start px-4 text-sidebar-foreground hover:text-error hover:bg-error/10 border-transparent hover:border-transparent"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

