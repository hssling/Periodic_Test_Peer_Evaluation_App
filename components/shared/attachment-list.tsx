"use client";

import { useMemo } from "react";
import { FileText, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const downloadBase = useMemo(() => "/api/attachments", []);

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
            onClick={() => {
              window.location.href = `${downloadBase}/${file.id}/download`;
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Open
          </Button>
        </div>
      ))}
    </div>
  );
}
