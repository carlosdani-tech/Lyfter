import { getSaleById as fetchSaleById, getSales as fetchSales } from "../api/salesApi.js";

function getRawSales(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.sales)) return response.sales;
  if (Array.isArray(response?.orders)) return response.orders;
  if (Array.isArray(response?.invoices)) return response.invoices;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.sales)) return response.data.sales;
  if (Array.isArray(response?.data?.orders)) return response.data.orders;
  if (Array.isArray(response?.data?.invoices)) return response.data.invoices;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.data?.sales)) return response.data.data.sales;
  if (Array.isArray(response?.data?.data?.orders)) return response.data.data.orders;
  if (Array.isArray(response?.data?.data?.invoices)) return response.data.data.invoices;
  return [];
}

function getRawSale(response) {
  return response?.sale || response?.order || response?.invoice || response?.data?.sale || response?.data?.order || response?.data?.invoice || response?.data?.data?.sale || response?.data?.data?.order || response?.data?.data?.invoice || response?.data?.data || response?.data || response || null;
}

function formatSaleDate(value) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizeSale(sale) {
  if (!sale) return null;

  const nestedSale = sale.sale || {};
  const total = Number(sale.total ?? sale.total_amount ?? sale.amount ?? sale.grandTotal ?? nestedSale.total_amount ?? 0);
  const createdAt = sale.createdAt ?? sale.created_at ?? sale.completed_at ?? sale.issued_at ?? sale.date ?? nestedSale.completed_at ?? "";
  const buyer = sale.buyer ?? sale.customer ?? sale.user ?? nestedSale.user ?? {};

  return {
    id: sale.id ?? sale.saleId ?? sale.orderId ?? sale.sale_id ?? nestedSale.id ?? "-",
    customer: buyer.fullName ?? buyer.name ?? sale.customerName ?? sale.buyerName ?? buyer.email ?? `Usuario ${nestedSale.user_id ?? sale.user_id ?? "-"}`,
    total: Number.isFinite(total) ? total : 0,
    status: sale.status ?? sale.state ?? nestedSale.status ?? "Registrada",
    createdAt,
    dateLabel: formatSaleDate(createdAt),
  };
}

export async function listSales(filters = {}) {
  const response = await fetchSales(filters);
  return getRawSales(response).map(normalizeSale).filter(Boolean);
}

export async function findSale(saleId) {
  const response = await fetchSaleById(saleId);
  return normalizeSale(getRawSale(response));
}