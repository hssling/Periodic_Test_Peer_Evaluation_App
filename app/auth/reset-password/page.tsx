"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { getSupabaseClient } from "@/lib/supabase/client";

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    const saved = localStorage.getItem("resetCooldownUntil");
    if (saved) setCooldownUntil(Number(saved));
  }, []);

  const onSubmit = async (data: ResetFormData) => {
    const now = Date.now();
    if (cooldownUntil && now < cooldownUntil) {
      const seconds = Math.ceil((cooldownUntil - now) / 1000);
      toast({
        variant: "warning",
        title: "Please wait",
        description: `Try again in ${seconds}s.`,
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) {
        const nextCooldown = Date.now() + 15_000;
        localStorage.setItem("resetCooldownUntil", String(nextCooldown));
        setCooldownUntil(nextCooldown);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
        return;
      }

      setEmailSent(true);
      toast({
        variant: "success",
        title: "Email sent!",
        description: "Check your inbox for the password reset link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow"
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold">
                Reset Password
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {emailSent
                  ? "Check your email for reset instructions"
                  : "Enter your email to receive a reset link"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-success/10 rounded-lg">
                  <p className="text-success font-medium">
                    Password reset email sent!
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    If you don&apos;t see it, check your spam folder.
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    icon={<Mail className="w-4 h-4" />}
                    error={errors.email?.message}
                    {...register("email")}
                  />
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <div className="text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    <ArrowLeft className="w-4 h-4 inline mr-1" />
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          MBBS Periodic Test & Peer Evaluation Platform
        </p>
      </motion.div>
    </div>
  );
}
