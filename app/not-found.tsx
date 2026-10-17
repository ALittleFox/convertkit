import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        {t("notFound")}
      </p>
      <Link href="/" className="mt-8">
        <Button variant="outline">
          <Home className="mr-2 h-4 w-4" />
          {t("backHome")}
        </Button>
      </Link>
    </div>
  );
}
