import type { Quote } from "@/api/quotes.api";
import type { Client } from "@/api/clients.api";
import { formatCurrency, formatDate } from "@/lib/utils";

export const JORMAR_WHATSAPP = "573022628888";

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  if (digits.length === 10 && digits.startsWith("3")) return `57${digits}`;
  return digits;
}

function clientLookup(clients: Client[], clientId: number | null): Client | null {
  if (clientId == null) return null;
  return clients.find((c) => c.id === clientId) ?? null;
}

export function resolveQuotePhone(
  quote: Quote,
  clients: Client[]
): { phone: string; isClient: boolean; client: Client | null } {
  const client = clientLookup(clients, quote.client_id);
  const clientPhone = normalizePhone(client?.phone);
  if (clientPhone) return { phone: clientPhone, isClient: true, client };
  return { phone: JORMAR_WHATSAPP, isClient: false, client };
}

export function buildQuoteMessage(quote: Quote, client: Client | null): string {
  const name = quote.client_name || client?.name || quote.client?.name || "cliente";
  const lines: string[] = [];

  lines.push(`*JORMAR DISTRIBUCIONES*`);
  lines.push(`Cotización ${quote.quote_number}`);
  lines.push(`Fecha: ${formatDate(quote.quote_date)}`);
  if (quote.valid_until) lines.push(`Validez: ${formatDate(quote.valid_until)}`);
  lines.push("");
  lines.push(`Hola ${name}, te compartimos la siguiente cotización:`);
  lines.push("");
  quote.items.forEach((item, idx) => {
    const label = item.product?.name || `Producto #${item.product_id}`;
    lines.push(`${idx + 1}. ${label}`);
    lines.push(
      `   ${item.quantity} x ${formatCurrency(Number(item.unit_price))} = ${formatCurrency(
        Number(item.total_price)
      )}`
    );
  });
  lines.push("");
  lines.push(`Subtotal: ${formatCurrency(Number(quote.subtotal))}`);
  if (Number(quote.discount) > 0) {
    lines.push(`Descuento: -${formatCurrency(Number(quote.discount))}`);
  }
  lines.push(`*TOTAL: ${formatCurrency(Number(quote.total))}*`);
  if (quote.notes?.trim()) {
    lines.push("");
    lines.push(`Observaciones: ${quote.notes.trim()}`);
  }
  lines.push("");
  lines.push("Quedamos atentos. ¡Gracias por preferirnos!");

  return lines.join("\n");
}

export function buildQuoteWaLink(
  quote: Quote,
  clients: Client[]
): { href: string; isClient: boolean; hasClient: boolean } {
  const { phone, isClient, client } = resolveQuotePhone(quote, clients);
  const text = buildQuoteMessage(quote, client);
  return {
    href: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
    isClient,
    hasClient: !!client,
  };
}
