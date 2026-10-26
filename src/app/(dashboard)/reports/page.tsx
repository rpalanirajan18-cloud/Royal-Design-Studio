import { Metadata } from "next";
import ReportsPage from "@/components/reports/ReportsPage";

export const metadata: Metadata = {
  title: "Reports",
};

export default function Page() {
  return <ReportsPage />;
}
