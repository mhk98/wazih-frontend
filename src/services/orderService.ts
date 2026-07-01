import { apiFetch } from "@/lib/api";
import { ApiResponse, ApiOrder, CreateOrderPayload } from "@/types/api";

export async function createOrder(payload: CreateOrderPayload): Promise<ApiOrder> {
  const res = await apiFetch<ApiResponse<ApiOrder>>("/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
