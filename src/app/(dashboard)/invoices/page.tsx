import { Metadata } from "next";
import InvoicesPage from "@/components/invoices/InvoicesPage";

export const metadata: Metadata = {
  title: "Sales Invoices",
};

export default function Page() {
  return <InvoicesPage />;
}
