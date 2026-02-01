"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  Copy,
  Globe,
  Heart,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Share2,
  Twitter,
} from "lucide-react";

export function PromotionFooter() {
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();

  const shareText =
    "🚀 Check out the Periodic Test Peer Evaluation App! Revolutionizing medical education with AI-powered testing, blinded peer evaluations, and batch-specific analytics. Built for efficiency and high-stakes learning!";
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://periodic-test-app.vercel.app";

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: title,
      description: "Copied to clipboard successfully!",
    });
  };

  return (
    <footer className="mt-auto pt-6 pb-4 border-t bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Author info */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Project Lead & Development
            </h3>
            <div className="space-y-2">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <p className="font-semibold text-base">Dr. Siddalingaiah H S</p>
                  <p className="text-xs text-muted-foreground">
                    Professor, Department of Community Medicine
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    Shridevi Institute of Medical Sciences and Research Hospital
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <a
                      href="mailto:hssling@yahoo.com"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      hssling@yahoo.com
                    </a>
                    <a
                      href="tel:8941087719"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      8941087719
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Made with{" "}
              <Heart className="w-3 h-3 text-destructive fill-destructive" />{" "}
              for Medical Education © {currentYear}
            </p>
          </div>

          {/* Sharing info */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Spread the Word
            </h3>
            <p className="text-xs text-muted-foreground">
              Help us reach more educators and students. Share this platform
              with your medical network!
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20 hover:bg-[#25D366]/20 hover:text-[#25D366]"
                onClick={() => window.open(shareLinks.whatsapp, "_blank")}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#0077B5]/10 text-[#0077B5] border-[#0077B5]/20 hover:bg-[#0077B5]/20 hover:text-[#0077B5]"
                onClick={() => window.open(shareLinks.linkedin, "_blank")}
              >
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-[#1DA1F2]/10 text-[#1DA1F2] border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]"
                onClick={() => window.open(shareLinks.twitter, "_blank")}
              >
                <Twitter className="w-4 h-4 mr-2" />X (Twitter)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(shareText + " " + shareUrl, "Message Copied")
                }
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Message
              </Button>
            </div>
            <Card className="bg-muted/50 border-none shadow-none">
              <CardContent className="p-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  Feature Spotlight
                </p>
                <p className="text-[11px] text-foreground font-medium">
                  Blinded Peer Evaluations • Batch-Specific Testing • AI
                  Question Generation • Offline-First Reliability • Real-time
                  Analytics
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </footer>
  );
}
