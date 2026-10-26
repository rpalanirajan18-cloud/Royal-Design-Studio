import { Metadata } from "next";
import QuotationsPage from "@/components/quotations/QuotationsPage";

export const metadata: Metadata = {
  title: "Quotations",
};

export default function Page() {
  return <QuotationsPage />;
}
