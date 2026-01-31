"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  FileText,
  ListChecks,
  LucideIcon,
} from "lucide-react";

const IconMap: Record<string, LucideIcon> = {
  Clock,
  CheckCircle,
  ListChecks,
  FileText,
};

interface Stat {
  name: string;
  value: number | string;
  icon: string; // Changed from LucideIcon to string
  color: string;
  bgColor: string;
}

interface DashboardStatsProps {
  stats: Stat[];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = IconMap[stat.icon] || FileText;

        return (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-xl border bg-card p-6 card-hover"
          >
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                <Icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
            </div>
            {/* Decorative gradient */}
            <div
              className={cn(
                "absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-10",
                stat.bgColor,
              )}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
