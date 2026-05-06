import { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import ProductModal from '../components/ProductModal';
import { useAuth } from '../context/AuthContext';
import { createProduct, deleteProduct, getProduct, getOrderHistoryByUser, listProducts, updateProduct } from '../lib/api';
import { currency, normalizeProduct, toArray } from '../lib/shop';
import { getThumbnail } from '../lib/cloudinary';

const EMPTY_FORM = {
  id: '',
  nombre: '',
  descripcion: '',
  precio: '',
  categoria: '',
  imagenUrl: '',
  variants: [],
};

function AdminDashboardPage() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function loadData() {
    try {
      const productsResponse = await listProducts();

      setProducts(toArray(productsResponse).map(normalizeProduct).filter(Boolean));
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar el dashboard.');
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadData();
  }, [user?.id]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  async function onSave(formData) {
    setMessage('');
    setIsLoading(true);

    const payload = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precio: Number(formData.precio),
      categoria: formData.categoria,
      imagenUrl: formData.imagenUrl,
      variantes: formData.variants ?? formData.variantes ?? [],
    };

    try {
      if (formData.id) {
        await updateProduct(formData.id, payload, token);
      } else {
        await createProduct(payload, token);
      }
      setForm(EMPTY_FORM);
      setIsModalOpen(false);
      setMessage('Producto guardado.');
      await loadData();
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar el producto.');
    } finally {
      setIsLoading(false);
    }
  }

  async function onDelete(id) {
    try {
      await deleteProduct(id, token);
      setMessage('Producto eliminado.');
      await loadData();
    } catch (error) {
      setMessage(error.message || 'No se pudo eliminar.');
    }
  }

  async function onEditProduct(productId) {
    try {
      setIsLoading(true);
      const productDetails = await getProduct(productId);
      const normalized = normalizeProduct(productDetails);
      
      setForm({
        id: normalized.id ?? '',
        nombre: normalized.nombre ?? '',
        descripcion: normalized.descripcion ?? '',
        precio: normalized.precio ?? '',
        categoria: normalized.categoria ?? '',
        imagenUrl: normalized.imagenUrl ?? '',
        variants: normalized.variants ?? [],
      });
      setIsModalOpen(true);
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar el producto.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#f5f1ea]">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Panel de administración</p>
          <h1 className="mt-2 text-5xl font-medium text-stone-950">Dashboard</h1>

          <section className="mt-8">
            <div className="rounded-3xl border border-stone-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-medium text-stone-950">Productos</h2>
                <button type="button" onClick={() => { setForm(EMPTY_FORM); setIsModalOpen(true); }} className="rounded-full bg-green-500 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-green-600">
                  Agregar nuevo producto
                </button>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left px-4 py-3 font-medium text-stone-600">Código</th>
                      <th className="text-left px-4 py-3 font-medium text-stone-600">Producto</th>
                      <th className="text-left px-4 py-3 font-medium text-stone-600">Categoría</th>
                      <th className="text-left px-4 py-3 font-medium text-stone-600">Precio</th>
                      <th className="text-center px-4 py-3 font-medium text-stone-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-stone-200 hover:bg-stone-50">
                        <td className="px-4 py-3 text-stone-900">{product.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imagenUrl && (
                              <img 
                                src={getThumbnail(product.imagenUrl)} 
                                alt={product.nombre} 
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <span className="text-stone-900">{product.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{product.categoria}</td>
                        <td className="px-4 py-3 text-stone-900 font-medium">{currency(product.precio)}</td>
                        <td className="px-4 py-3 text-center space-x-2">
                          <button type="button" onClick={() => onEditProduct(product.id)} className="text-orange-500 hover:text-orange-700 text-lg">✎</button>
                          <button type="button" onClick={() => onDelete(product.id)} className="text-red-500 hover:text-red-700 text-lg">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </section>

          {message ? <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p> : null}
        </main>
      </div>

      <ProductModal 
          isOpen={isModalOpen}
          form={form}
          onClose={() => { setIsModalOpen(false); setForm(EMPTY_FORM); }}
          onSave={onSave}
          isLoading={isLoading}
          previewImage={form.imagenUrl}
        />
    </>
  );
}

export default AdminDashboardPage;
