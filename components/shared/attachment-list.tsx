"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

export interface AttachmentItem {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface AttachmentListProps {
  files: AttachmentItem[];
  emptyLabel?: string;
}

export function AttachmentList({
  files,
  emptyLabel = "No attachments uploaded.",
}: AttachmentListProps) {
  const supabase = getSupabaseClient();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadUrls = async () => {
      const nextUrls: Record<string, string> = {};
      for (const file of files) {
        if (urls[file.id]) continue;
        setLoadingIds((prev) => new Set(prev).add(file.id));
        const { data } = await supabase
          .storage
          .from("attempt-uploads")
          .createSignedUrl(file.file_path, 600);
        if (data?.signedUrl) {
          nextUrls[file.id] = data.signedUrl;
        }
      }
      if (!cancelled && Object.keys(nextUrls).length > 0) {
        setUrls((prev) => ({ ...prev, ...nextUrls }));
      }
      if (!cancelled) {
        setLoadingIds(new Set());
      }
    };

    if (files.length > 0) {
      loadUrls();
    }

    return () => {
      cancelled = true;
    };
  }, [files, supabase, urls]);

  if (!files || files.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-md bg-muted p-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(file.size_bytes / 1024)} KB •{" "}
                {formatDate(file.created_at, { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!urls[file.id] || loadingIds.has(file.id)}
            onClick={() => urls[file.id] && window.open(urls[file.id], "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            {loadingIds.has(file.id) ? "Loading" : "Open"}
          </Button>
        </div>
      ))}
    </div>
  );
}
