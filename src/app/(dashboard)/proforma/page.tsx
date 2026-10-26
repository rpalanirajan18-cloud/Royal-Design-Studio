import { Metadata } from "next";
import ProformaPage from "@/components/proforma/ProformaPage";

export const metadata: Metadata = {
  title: "Proforma Invoices",
};

export default function Page() {
  return <ProformaPage />;
}
