import { Metadata } from "next";
import PricingTiersPage from "@/components/pricing/PricingTiersPage";

export const metadata: Metadata = {
  title: "Pricing Rate Tiers | Royal Design Studio",
  description: "Manage Retail vs Wholesale pricing rate tiers, margins, and customer tier mapping",
};

export default function Page() {
  return <PricingTiersPage />;
}
