import { createPageMetadata, createPageLayout } from "@/lib/create-layout";

export const revalidate = 31536000; // 1 year
export const generateMetadata = createPageMetadata("favicon");
export default createPageLayout("favicon");
