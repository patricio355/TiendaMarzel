import { useEffect, useRef, useState } from 'react';
import { getLargeImage } from '../lib/cloudinary';

const TALLE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const COLOR_OPTIONS = ['NEGRO', 'BLANCO', 'GRIS', 'AZUL', 'VERDE', 'ROJO', 'BEIGE', 'CRUDO', 'MARRON', 'CELESTE', 'VIOLETA', 'ROSADO'];

const EMPTY_FORM = {
  id: '',
  nombre: '',
  descripcion: '',
  precio: '',
  categoria: '',
  imagenUrl: '',
  variants: [],
};

function ProductModal({ isOpen, form, onClose, onSave, isLoading = false, previewImage = null }) {
  const [localForm, setLocalForm] = useState(form);
  const [imagePreview, setImagePreview] = useState(previewImage);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalForm(form);
    setImagePreview(previewImage);
  }, [form, previewImage]);

  useEffect(() => {
    // Ensure variants array exists
    setLocalForm((prev) => ({ ...(prev || {}), variants: (prev?.variants ?? form?.variants ?? []) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar que sea imagen
    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen no debe superar 5MB');
      return;
    }

    setUploadError('');
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'tienda_virtual');
      formData.append('folder', 'tienda_virtual/productos');

      const response = await fetch(
        'https://api.cloudinary.com/v1_1/drjn5sbwz/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await response.json();
      const imageUrl = data.secure_url;

      setLocalForm((prev) => ({
        ...prev,
        imagenUrl: imageUrl,
      }));
      setImagePreview(imageUrl);
    } catch (error) {
      setUploadError(error.message || 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(localForm);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 my-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-medium text-stone-950">
            {localForm.id ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Imagen */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-stone-700">Imagen del Producto</label>
            {(imagePreview || localForm.imagenUrl) && (
              <div className="mb-3 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 aspect-square">
                <img
                  src={getLargeImage(imagePreview || localForm.imagenUrl)}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || isLoading}
                className="flex-1 rounded-2xl border-2 border-dashed border-stone-300 px-4 py-3 text-sm text-stone-600 hover:border-stone-400 hover:bg-stone-50 disabled:opacity-50"
              >
                {uploadingImage ? 'Subiendo...' : 'Seleccionar Imagen'}
              </button>
              {localForm.imagenUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalForm((prev) => ({ ...prev, imagenUrl: '' }));
                    setImagePreview(null);
                  }}
                  className="rounded-2xl border border-stone-300 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImage || isLoading}
            />
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          </div>

          {/* ID (solo lectura para edición) */}
          {localForm.id && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.2em] text-stone-600">
                ID
              </label>
              <input
                value={localForm.id}
                disabled
                className="mt-1 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-600 outline-none"
              />
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.2em] text-stone-600">
              Nombre
            </label>
            <input
              value={localForm.nombre}
              onChange={(e) => setLocalForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Nombre del producto"
              required
              className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-400"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.2em] text-stone-600">
              Categoría
            </label>
            <input
              value={localForm.categoria}
              onChange={(e) => setLocalForm((prev) => ({ ...prev, categoria: e.target.value }))}
              placeholder="Categoría"
              required
              className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-400"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.2em] text-stone-600">
              Precio
            </label>
            <input
              value={localForm.precio}
              onChange={(e) => setLocalForm((prev) => ({ ...prev, precio: e.target.value }))}
              placeholder="Precio"
              type="number"
              step="0.01"
              required
              className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-400"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.2em] text-stone-600">
              Descripción
            </label>
            <textarea
              value={localForm.descripcion}
              onChange={(e) => setLocalForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Descripción del producto"
              rows="4"
              className="mt-1 w-full rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-stone-400"
            />
          </div>

          {/* Variantes */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.2em] text-stone-600">Variantes</label>
            <div className="mt-2 space-y-2">
              {(localForm.variants || []).map((variant, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={variant.talle || ''}
                    onChange={(e) => setLocalForm((prev) => {
                      const next = { ...(prev || {}) };
                      next.variants = Array.from(next.variants || []);
                      next.variants[idx] = { ...(next.variants[idx] || {}), talle: e.target.value };
                      return next;
                    })}
                    className="w-32 rounded-2xl border border-stone-300 px-3 py-2 outline-none bg-white"
                  >
                    <option value="">Talle</option>
                    {TALLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <select
                    value={variant.color || ''}
                    onChange={(e) => setLocalForm((prev) => {
                      const next = { ...(prev || {}) };
                      next.variants = Array.from(next.variants || []);
                      next.variants[idx] = { ...(next.variants[idx] || {}), color: e.target.value };
                      return next;
                    })}
                    className="w-36 rounded-2xl border border-stone-300 px-3 py-2 outline-none bg-white"
                  >
                    <option value="">Color</option>
                    {COLOR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <input
                    value={variant.stock ?? ''}
                    onChange={(e) => setLocalForm((prev) => {
                      const next = { ...(prev || {}) };
                      next.variants = Array.from(next.variants || []);
                      next.variants[idx] = { ...(next.variants[idx] || {}), stock: Number(e.target.value) };
                      return next;
                    })}
                    placeholder="Stock"
                    type="number"
                    className="w-20 rounded-2xl border border-stone-300 px-3 py-2 outline-none"
                  />

                  <input
                    value={variant.precio ?? ''}
                    onChange={(e) => setLocalForm((prev) => {
                      const next = { ...(prev || {}) };
                      next.variants = Array.from(next.variants || []);
                      next.variants[idx] = { ...(next.variants[idx] || {}), precio: e.target.value };
                      return next;
                    })}
                    placeholder="Precio variante"
                    type="number"
                    step="0.01"
                    className="w-28 rounded-2xl border border-stone-300 px-3 py-2 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setLocalForm((prev) => {
                      const next = { ...(prev || {}) };
                      next.variants = Array.from(next.variants || []);
                      next.variants.splice(idx, 1);
                      return next;
                    })}
                    className="rounded-full bg-red-50 px-3 py-2 text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              ))}

              <div>
                <button
                  type="button"
                  onClick={() => setLocalForm((prev) => ({ ...(prev || {}), variants: [...(prev?.variants || []), { talle: '', color: '', stock: 0, precio: '' }] }))}
                  className="rounded-2xl border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  Agregar variante
                </button>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-2xl border border-stone-300 px-4 py-3 text-xs uppercase tracking-[0.25em] text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || uploadingImage || !localForm.nombre || !localForm.categoria || !localForm.precio || !localForm.imagenUrl}
              className="flex-1 rounded-2xl bg-stone-900 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductModal;
