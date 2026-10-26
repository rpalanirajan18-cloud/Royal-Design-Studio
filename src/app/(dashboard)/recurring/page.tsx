import { Metadata } from "next";
import RecurringPage from "@/components/recurring/RecurringPage";

export const metadata: Metadata = {
  title: "Recurring Billing",
};

export default function Page() {
  return <RecurringPage />;
}
