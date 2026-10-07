import { useState } from "react";

const emptyProductForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  image_url: "",
  stock: "",
};

function useProductForm() {
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(() => ({
    ...emptyProductForm,
  }));
  const [formError, setFormError] = useState("");

  const resetForm = () => {
    setEditingProduct(null);
    setProductForm({ ...emptyProductForm });
    setFormError("");
  };

  const clearEditingState = () => {
    setEditingProduct(null);
    setFormError("");
  };

  const startEditing = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      category: product.category ?? "",
      image_url: product.image_url ?? "",
      stock: String(product.stock),
    });
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setProductForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const errors = [];

    if (!productForm.name.trim()) {
      errors.push("El nombre es obligatorio.");
    }

    if (!productForm.description.trim()) {
      errors.push("La descripción es obligatoria.");
    }

    if (!productForm.category.trim()) {
      errors.push("La categoría es obligatoria.");
    }

    if (!productForm.image_url.trim()) {
      errors.push("La URL de la imagen es obligatoria.");
    }

    const price = Number(productForm.price);
    if (
      productForm.price.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      errors.push("El precio debe ser un número mayor o igual a 0.");
    }

    const stock = Number(productForm.stock);
    if (
      productForm.stock.trim() === "" ||
      !Number.isFinite(stock) ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      errors.push("El stock debe ser un número entero mayor o igual a 0.");
    }

    return errors.length > 0
      ? `Revisa los datos del producto: ${errors.join(" ")}`
      : "";
  };

  const createPayload = () => ({
    name: productForm.name.trim(),
    description: productForm.description.trim(),
    price: Number(productForm.price),
    category: productForm.category.trim(),
    image_url: productForm.image_url.trim(),
    stock: Number(productForm.stock),
  });

  return {
    editingProduct,
    productForm,
    formError,
    startEditing,
    handleFormChange,
    validateForm,
    createPayload,
    resetForm,
    clearEditingState,
    setFormError,
  };
}

export default useProductForm;
