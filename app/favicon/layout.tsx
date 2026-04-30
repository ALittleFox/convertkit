import { createPageMetadata, PassthroughLayout } from "@/lib/create-layout";

export const revalidate = 31536000; // 1 year
export const generateMetadata = createPageMetadata("favicon");
export default PassthroughLayout;
