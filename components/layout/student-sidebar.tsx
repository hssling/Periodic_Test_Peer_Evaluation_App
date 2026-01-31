"use client";

import { UserAvatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface StudentSidebarProps {
  profile: Tables<"profiles">;
}

const navigation = [
  { name: "Dashboard", href: "/student/dashboard", icon: Home },
  { name: "My Tests", href: "/student/tests", icon: FileText },
  { name: "Evaluations", href: "/student/evaluations", icon: ClipboardCheck },
  { name: "Results", href: "/student/results", icon: BarChart3 },
  { name: "Profile", href: "/student/profile", icon: User },
];

export function StudentSidebar({ profile }: StudentSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-background dark:bg-slate-950 px-6 pb-4"
        >
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Periodic Test</h1>
              <p className="text-xs text-muted-foreground">Student Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-transform duration-200",
                              isActive && "scale-110",
                            )}
                          />
                          {item.name}
                          {isActive && (
                            <ChevronRight className="ml-auto h-5 w-5" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              {/* User Profile Section */}
              <li className="mt-auto">
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={profile.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {profile.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile.roll_no || profile.email}
                      </p>
                    </div>
                  </div>
                  {profile.batch && (
                    <div className="mt-3 flex gap-2">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        Batch {profile.batch}
                      </span>
                      {profile.section && (
                        <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                          Group {profile.section}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            </ul>
          </nav>
        </motion.div>
      </div>

      {/* Mobile Navigation will be handled by TopNav */}
    </>
  );
}
