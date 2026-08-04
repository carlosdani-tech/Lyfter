import { deactivateProductRecord, deleteProductRecord, listProducts } from "../services/productService.js";
import { listSales } from "../services/salesService.js";
import { showEmpty, showError, showLoading, showMessage, clearMessage } from "../ui/alerts.js";
import { escapeHtml, formatCurrency } from "../utils/formatters.js";
import { handleApiAuthError, requireAdmin } from "../utils/guards.js";

const adminRoot = document.querySelector("[data-admin-root]");
const statusMessage = document.querySelector("[data-admin-status]");
const productsTable = document.querySelector("[data-products-table]");
const refreshButton = document.querySelector("[data-refresh-products]");
const salesStatus = document.querySelector("[data-sales-status]");
const salesTable = document.querySelector("[data-sales-table]");
const refreshSalesButton = document.querySelector("[data-refresh-sales]");
let isLoadingInventory = false;
let isLoadingSales = false;
let activeProductActionId = null;

function setAdminVisible(isVisible) {
  if (adminRoot) adminRoot.hidden = !isVisible;
}

function renderProductsTable(products) {
  if (!productsTable) return;

  if (!products.length) {
    productsTable.innerHTML = '<p class="empty-state">No hay productos registrados.</p>';
    return;
  }

  productsTable.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Categoría</th>
          <th>Precio</th>
          <th>Stock</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${products.map((product) => `
          <tr>
            <td>
              <strong>${escapeHtml(product.name)}</strong>
              <span>${escapeHtml(product.description)}</span>
            </td>
            <td>${escapeHtml(product.category)}</td>
            <td>${formatCurrency(product.price)}</td>
            <td>${product.stock}</td>
            <td>${product.active ? "Activo" : "Inactivo"}</td>
            <td>
              <div class="table-actions">
                <a class="button secondary-button" href="./edit-product.html?id=${encodeURIComponent(product.id)}">Editar</a>
                <button class="button secondary-button" type="button" data-deactivate-product data-product-id="${escapeHtml(product.id)}">Desactivar</button>
                <button class="button secondary-button danger-button" type="button" data-delete-product data-product-id="${escapeHtml(product.id)}">Eliminar</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderSalesTable(sales) {
  if (!salesTable) return;

  if (!sales.length) {
    salesTable.innerHTML = '<p class="empty-state">No hay ventas registradas.</p>';
    return;
  }

  salesTable.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Venta</th>
          <th>Cliente</th>
          <th>Total</th>
          <th>Estado</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        ${sales.map((sale) => `
          <tr>
            <td>${escapeHtml(sale.id)}</td>
            <td>${escapeHtml(sale.customer)}</td>
            <td>${formatCurrency(sale.total)}</td>
            <td>${escapeHtml(sale.status)}</td>
            <td>${escapeHtml(sale.dateLabel)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getAdminSalesErrorMessage(error) {
  if (error?.isUnauthorized) return "Debes iniciar sesión o tu sesión expiró.";
  if (error?.isForbidden) return "No tienes permisos para ver ventas.";
  if (error?.status === 404) return "La sección de ventas no está disponible en este momento.";
  if (error?.status === 500) return "Error del servidor al cargar ventas.";
  return error?.message || "No se pudieron cargar las ventas.";
}

async function loadInventory() {
  if (isLoadingInventory) return;

  isLoadingInventory = true;
  if (refreshButton) refreshButton.disabled = true;
  showLoading(statusMessage, "Cargando inventario...");

  try {
    const products = await listProducts({}, { forceRefresh: true });
    renderProductsTable(products);

    if (products.length) {
      clearMessage(statusMessage);
    } else {
      showEmpty(statusMessage, "No hay productos registrados.");
    }
  } catch (error) {
    if (handleApiAuthError(error)) return;
    productsTable.innerHTML = "";
    showError(statusMessage, error.message || "No se pudo cargar el inventario.");
  } finally {
    isLoadingInventory = false;
    if (refreshButton) refreshButton.disabled = false;
  }
}

async function loadSales() {
  if (isLoadingSales) return;

  isLoadingSales = true;
  if (refreshSalesButton) refreshSalesButton.disabled = true;
  showLoading(salesStatus, "Cargando ventas...");

  try {
    const sales = await listSales();
    renderSalesTable(sales);

    if (sales.length) {
      clearMessage(salesStatus);
    } else {
      showEmpty(salesStatus, "No hay ventas registradas.");
    }
  } catch (error) {
    if (salesTable) salesTable.innerHTML = "";

    if (error?.isUnauthorized) {
      setAdminVisible(false);
      handleApiAuthError(error);
      return;
    }

    if (error?.isForbidden) {
      setAdminVisible(false);
      handleApiAuthError(error);
      return;
    }

    showError(salesStatus, getAdminSalesErrorMessage(error));
  } finally {
    isLoadingSales = false;
    if (refreshSalesButton) refreshSalesButton.disabled = false;
  }
}

async function handleProductAction(action, productId, actionButton = null) {
  if (activeProductActionId) return;

  activeProductActionId = `${action}:${productId}`;
  if (actionButton) actionButton.disabled = true;

  try {
    if (action === "deactivate") {
      await deactivateProductRecord(productId);
    }

    if (action === "delete") {
      await deleteProductRecord(productId);
    }

    await loadInventory();

    if (action === "deactivate") {
      showMessage(statusMessage, "Producto desactivado correctamente.", "success");
    }

    if (action === "delete") {
      showMessage(statusMessage, "Producto eliminado correctamente.", "success");
    }
  } catch (error) {
    if (handleApiAuthError(error)) return;
    showError(statusMessage, error.message || "No se pudo completar la acción.");
  } finally {
    activeProductActionId = null;
    if (actionButton) actionButton.disabled = false;
  }
}

if (requireAdmin()) {
  setAdminVisible(true);
  loadInventory();
  loadSales();
}

refreshButton?.addEventListener("click", loadInventory);
refreshSalesButton?.addEventListener("click", loadSales);

productsTable?.addEventListener("click", (event) => {
  const deactivateButton = event.target.closest("[data-deactivate-product]");
  const deleteButton = event.target.closest("[data-delete-product]");

  if (deactivateButton) {
    handleProductAction("deactivate", deactivateButton.dataset.productId, deactivateButton);
  }

  if (deleteButton) {
    const confirmed = window.confirm("Esta acción eliminará el producto del catálogo. ¿Deseas continuar?");

    if (confirmed) {
      handleProductAction("delete", deleteButton.dataset.productId, deleteButton);
    }
  }
});
