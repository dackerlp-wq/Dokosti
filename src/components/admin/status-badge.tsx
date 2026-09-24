import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/admin";

const KIND: Record<OrderStatus, "novinka" | "skladem" | "sleva" | "neutral"> = {
  nova: "novinka",
  potvrzena: "skladem",
  pripravena: "skladem",
  doruceno: "neutral",
  zrusena: "sleva",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge kind={KIND[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
