import { Metadata } from "next";
import OrdersPage from "@/components/orders/OrdersPage";

export const metadata: Metadata = {
  title: "Orders",
};

export default function Page() {
  return <OrdersPage />;
}
