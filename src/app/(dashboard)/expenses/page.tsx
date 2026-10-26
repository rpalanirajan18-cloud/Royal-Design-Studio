import { Metadata } from "next";
import ExpensesPage from "@/components/expenses/ExpensesPage";

export const metadata: Metadata = {
  title: "Expenses",
};

export default function Page() {
  return <ExpensesPage />;
}
