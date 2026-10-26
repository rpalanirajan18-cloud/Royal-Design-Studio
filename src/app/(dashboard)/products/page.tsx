import { Metadata } from "next";
import ProductsPage from "@/components/products/ProductsPage";

export const metadata: Metadata = {
  title: "Products & Services",
};

export default function Page() {
  return <ProductsPage />;
}
