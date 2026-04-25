import { connection } from "next/server";
import { PaymentTrackerApp } from "@/components/payment-tracker-app";

export default async function AppPage() {
  await connection();
  return <PaymentTrackerApp />;
}
