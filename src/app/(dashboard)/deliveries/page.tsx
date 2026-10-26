import { Metadata } from "next";
import DeliveriesPage from "@/components/deliveries/DeliveriesPage";

export const metadata: Metadata = {
  title: "Delivery Management",
};

export default function Page() {
  return <DeliveriesPage />;
}
