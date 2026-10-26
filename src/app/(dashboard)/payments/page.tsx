import { Metadata } from "next";
import PaymentsPage from "@/components/payments/PaymentsPage";

export const metadata: Metadata = {
  title: "Payments & Receipts",
};

export default function Page() {
  return <PaymentsPage />;
}
