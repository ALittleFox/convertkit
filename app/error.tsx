"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-bold text-foreground">500</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        {t("serverError")}
      </p>
      <Button variant="outline" className="mt-8" onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {t("retry")}
      </Button>
    </div>
  );
}
