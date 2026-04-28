import { connection } from "next/server";
import { PaymentTrackerApp } from "@/components/payment-tracker-app";

export default async function UploadPage() {
  await connection();
  return <PaymentTrackerApp initialView="upload" />;
}
