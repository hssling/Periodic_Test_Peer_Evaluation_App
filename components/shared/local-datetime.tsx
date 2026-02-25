"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_TIME_ZONE } from "@/lib/utils";

interface LocalDateTimeProps {
  value: string | Date | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
}

export function LocalDateTime({
  value,
  options,
  fallback = "—",
}: LocalDateTimeProps) {
  const [text, setText] = useState(fallback);

  const formatter = useMemo(() => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: APP_TIME_ZONE,
      ...options,
    };
    return new Intl.DateTimeFormat("en-US", defaultOptions);
  }, [options]);

  useEffect(() => {
    if (!value) {
      setText(fallback);
      return;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      setText(fallback);
      return;
    }
    setText(formatter.format(date));
  }, [fallback, formatter, value]);

  return <span>{text}</span>;
}
