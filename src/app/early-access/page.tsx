import { EarlyAccessForm } from "./EarlyAccessForm";
import { normalizeWhatsAppE164 } from "@/lib/whatsappEarlyAccess";

export default function EarlyAccessPage() {
  const raw = process.env.WHATSAPP_NUMBER ?? "";
  const whatsappE164Digits = raw ? normalizeWhatsAppE164(raw) : "";

  return <EarlyAccessForm whatsappE164Digits={whatsappE164Digits} />;
}
