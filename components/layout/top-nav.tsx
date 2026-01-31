"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

interface TopNavProps {
  profile: Tables<"profiles">;
}

const studentNavigation = [
  { name: "Dashboard", href: "/student/dashboard", icon: Home },
  { name: "My Tests", href: "/student/tests", icon: FileText },
  { name: "Evaluations", href: "/student/evaluations", icon: ClipboardCheck },
  { name: "Results", href: "/student/results", icon: BarChart3 },
  { name: "Profile", href: "/student/profile", icon: User },
];

const adminNavigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Home },
  { name: "Tests", href: "/admin/tests", icon: FileText },
  { name: "Users", href: "/admin/users", icon: User },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
];

export function TopNav({ profile }: TopNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const isAdmin = profile.role === "admin" || profile.role === "faculty";
  const navigation = isAdmin ? adminNavigation : studentNavigation;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="flex h-16 items-center gap-x-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Logo for mobile */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">Periodic Test</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="rounded-lg relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <UserAvatar name={profile.name} size="sm" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium">{profile.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {profile.role}
              </p>
            </div>
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl bg-card border border-border shadow-lg p-1"
                >
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href={isAdmin ? "/admin/profile" : "/student/profile"}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-border pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Content drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-[300px] bg-white dark:bg-slate-950 border-r border-border shadow-2xl flex flex-col h-full"
            >
              {/* Header inside drawer */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-white dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold text-slate-900 dark:text-white">
                      Periodic Test
                    </h1>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {profile.role} Portal
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-950">
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted text-slate-700 dark:text-slate-200 transition-colors active:scale-[0.98] font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Footer inside drawer */}
              <div className="p-6 border-t border-border mt-auto bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-border shadow-sm">
                  <UserAvatar name={profile.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-slate-900 dark:text-white">
                      {profile.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate uppercase">
                      {profile.role}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={isAdmin ? "/admin/profile" : "/student/profile"}
                    className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium transition-colors border border-destructive/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}
