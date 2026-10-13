import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { formatProductValidationError } from "../utils/apiValidation";

const DEACTIVATION_CONFIRMATION_TOAST_ID = "product-deactivation-confirmation";
const DEACTIVATION_SUCCESS_TOAST_ID = "product-deactivation-success";
const DEACTIVATION_ERROR_TOAST_ID = "product-deactivation-error";
const CREATION_TOAST_ID = "product-creation";
const CREATION_ACCESS_TOAST_ID = "product-creation-access";
const CREATION_VALIDATION_TOAST_ID = "product-creation-validation";
const EDIT_TOAST_ID = "product-edit";
const EDIT_ACCESS_TOAST_ID = "product-edit-access";
const EDIT_VALIDATION_TOAST_ID = "product-edit-validation";

const showValidationToast = (toastId, message) => {
  if (toast.isActive(toastId)) {
    toast.update(toastId, { render: message, type: "warning" });
    return;
  }

  toast.warning(message, { toastId });
};

function useProductMutations({
  isAdmin,
  accessToken,
  editingProduct,
  validateForm,
  createPayload,
  resetForm,
  setFormError,
  createProduct,
  updateProduct,
  deactivateProduct,
  replaceSelectedProduct,
  clearSelectedProductById,
  onSessionExpired,
  onEditSuccess,
}) {
  const [mutationLoading, setMutationLoading] = useState(false);
  const [deactivatingProductId, setDeactivatingProductId] = useState(null);
  const creationInProgressRef = useRef(false);
  const editInProgressRef = useRef(false);
  const deactivationInProgressRef = useRef(false);

  const handleMutationError = (error, action, setError = setFormError) => {
    const validationMessage = formatProductValidationError(error);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    if (error.status === 401) {
      const message = "Tu sesión expiró. Inicia sesión nuevamente.";
      onSessionExpired(message);
      setError(message);
      return;
    }

    if (error.status === 403) {
      setError("No tienes permisos para modificar productos.");
      return;
    }

    if (error.status === 0) {
      setError(
        `No se pudo conectar con el servidor para ${action} el producto.`,
      );
      return;
    }

    if (error.status >= 500) {
      setError(
        `El servidor no pudo ${action} el producto. Intenta nuevamente.`,
      );
      return;
    }

    setError(`No se pudo ${action} el producto. Intenta nuevamente.`);
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();

    if (creationInProgressRef.current) {
      return;
    }

    if (!isAdmin || !accessToken) {
      const message =
        "Debes iniciar sesión como administrador para agregar productos.";
      setFormError("");
      toast.error(message, { toastId: CREATION_ACCESS_TOAST_ID });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      showValidationToast(CREATION_VALIDATION_TOAST_ID, validationError);
      return;
    }

    creationInProgressRef.current = true;
    setFormError("");
    setMutationLoading(true);
    toast.dismiss(CREATION_VALIDATION_TOAST_ID);
    toast.loading("Agregando producto...", { toastId: CREATION_TOAST_ID });

    try {
      await createProduct(createPayload(), accessToken);
      resetForm();
      toast.update(CREATION_TOAST_ID, {
        render: "Producto agregado correctamente.",
        type: "success",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } catch (error) {
      handleMutationError(error, "agregar", (message) => {
        setFormError(message);
        toast.update(CREATION_TOAST_ID, {
          render: message,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      });
    } finally {
      creationInProgressRef.current = false;
      setMutationLoading(false);
    }
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();

    if (editInProgressRef.current) {
      return;
    }

    if (!isAdmin || !accessToken || !editingProduct) {
      const message =
        "Debes iniciar sesión como administrador para actualizar productos.";
      setFormError("");
      toast.error(message, { toastId: EDIT_ACCESS_TOAST_ID });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      showValidationToast(EDIT_VALIDATION_TOAST_ID, validationError);
      return;
    }

    editInProgressRef.current = true;
    setFormError("");
    setMutationLoading(true);
    toast.dismiss(EDIT_VALIDATION_TOAST_ID);
    toast.loading("Guardando cambios...", { toastId: EDIT_TOAST_ID });

    try {
      const updatedProduct = await updateProduct(
        editingProduct.id,
        createPayload(),
        accessToken,
      );
      replaceSelectedProduct(updatedProduct);
      resetForm();
      onEditSuccess();
      toast.update(EDIT_TOAST_ID, {
        render: "Producto actualizado correctamente.",
        type: "success",
        isLoading: false,
        autoClose: 5000,
        closeButton: true,
      });
    } catch (error) {
      handleMutationError(error, "actualizar", (message) => {
        setFormError(message);
        toast.update(EDIT_TOAST_ID, {
          render: message,
          type: "error",
          isLoading: false,
          autoClose: 5000,
          closeButton: true,
        });
      });
    } finally {
      editInProgressRef.current = false;
      setMutationLoading(false);
    }
  };

  const performProductDeactivation = async (product) => {
    if (deactivationInProgressRef.current) {
      return;
    }

    deactivationInProgressRef.current = true;
    setDeactivatingProductId(product.id);

    try {
      await deactivateProduct(product.id, accessToken);
      clearSelectedProductById(product.id);

      if (editingProduct?.id === product.id) {
        resetForm();
      }

      toast.success("Producto eliminado correctamente.", {
        toastId: DEACTIVATION_SUCCESS_TOAST_ID,
      });
    } catch (error) {
      handleMutationError(error, "eliminar", (message) => {
        toast.error(message, { toastId: DEACTIVATION_ERROR_TOAST_ID });
      });
    } finally {
      deactivationInProgressRef.current = false;
      setDeactivatingProductId(null);
    }
  };

  const deleteProduct = (product) => {
    if (!isAdmin || !accessToken) {
      setFormError(
        "Debes iniciar sesión como administrador para modificar productos.",
      );
      return;
    }

    if (
      deactivationInProgressRef.current ||
      toast.isActive(DEACTIVATION_CONFIRMATION_TOAST_ID)
    ) {
      return;
    }

    toast.warning(
      <div className="toast-confirmation">
        <p>
          ¿Deseas eliminar el producto "{product.name}"? Dejará de aparecer en
          el catálogo.
        </p>
        <div className="toast-confirmation__actions">
          <button
            type="button"
            className="toast-confirmation__confirm toast-confirmation__confirm--danger"
            onClick={() => {
              toast.dismiss(DEACTIVATION_CONFIRMATION_TOAST_ID);
              void performProductDeactivation(product);
            }}
          >
            Eliminar
          </button>
          <button
            type="button"
            className="toast-confirmation__cancel"
            onClick={() => toast.dismiss(DEACTIVATION_CONFIRMATION_TOAST_ID)}
          >
            Cancelar
          </button>
        </div>
      </div>,
      {
        toastId: DEACTIVATION_CONFIRMATION_TOAST_ID,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
      },
    );
  };

  return {
    mutationLoading,
    deactivatingProductId,
    handleAddProduct,
    handleSaveProduct,
    deleteProduct,
  };
}

export default useProductMutations;
