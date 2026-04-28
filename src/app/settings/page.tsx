import { connection } from "next/server";
import { PaymentTrackerApp } from "@/components/payment-tracker-app";

export default async function SettingsPage() {
  await connection();
  return <PaymentTrackerApp initialView="settings" />;
}
