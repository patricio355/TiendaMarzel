import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { createProduct, deleteProduct, getOrderHistoryByUser, listProducts, updateProduct } from '../lib/api';
import { currency, normalizeProduct, toArray } from '../lib/shop';

const EMPTY_FORM = {
  id: '',
  nombre: '',
  descripcion: '',
  precio: '',
  categoria: '',
  imagenUrl: '',
};

function AdminDashboardPage() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');

  async function loadData() {
    try {
      const [productsResponse, ordersResponse] = await Promise.all([
        listProducts(),
        user?.id ? getOrderHistoryByUser(user.id, token) : Promise.resolve([]),
      ]);

      setProducts(toArray(productsResponse).map(normalizeProduct).filter(Boolean));
      setOrders(toArray(ordersResponse));
    } catch (error) {
      setMessage(error.message || 'No se pudo cargar el dashboard.');
    }
  }

  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadData();
  }, [user?.id]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  async function onSave(event) {
    event.preventDefault();
    setMessage('');

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: Number(form.precio),
      categoria: form.categoria,
      imagenUrl: form.imagenUrl,
    };

    try {
      if (form.id) {
        await updateProduct(form.id, payload, token);
      } else {
        await createProduct(payload, token);
      }
      setForm(EMPTY_FORM);
      setMessage('Producto guardado.');
      await loadData();
    } catch (error) {
      setMessage(error.message || 'No se pudo guardar el producto.');
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

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Panel de administración</p>
        <h1 className="mt-2 text-5xl font-medium text-stone-950">Dashboard</h1>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6">
            <h2 className="text-3xl font-medium text-stone-950">Productos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-2xl border border-stone-200">
                  <img src={product.imagenUrl} alt={product.nombre} className="h-40 w-full object-cover" />
                  <div className="p-4">
                    <h3 className="text-xl font-medium text-stone-950">{product.nombre}</h3>
                    <p className="text-sm text-stone-500">{currency(product.precio)}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => setForm({
                        id: product.id ?? '',
                        nombre: product.nombre ?? '',
                        descripcion: product.descripcion ?? '',
                        precio: product.precio ?? '',
                        categoria: product.categoria ?? '',
                        imagenUrl: product.imagenUrl ?? '',
                      })} className="rounded-full border border-stone-300 px-3 py-1 text-xs uppercase tracking-[0.2em]">Editar</button>
                      <button type="button" onClick={() => onDelete(product.id)} className="rounded-full border border-stone-300 px-3 py-1 text-xs uppercase tracking-[0.2em]">Eliminar</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <form onSubmit={onSave} className="rounded-3xl border border-stone-200 bg-white p-6">
              <h2 className="text-3xl font-medium text-stone-950">Editor</h2>
              <div className="mt-4 grid gap-3">
                <input value={form.id} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} placeholder="ID (vacío para crear)" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                <input value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} placeholder="Nombre" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                <input value={form.categoria} onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))} placeholder="Categoría" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                <input value={form.precio} onChange={(event) => setForm((current) => ({ ...current, precio: event.target.value }))} placeholder="Precio" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                <input value={form.imagenUrl} onChange={(event) => setForm((current) => ({ ...current, imagenUrl: event.target.value }))} placeholder="Imagen URL" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                <textarea value={form.descripcion} onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))} rows="4" placeholder="Descripción" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none" />
                <button type="submit" className="rounded-2xl bg-stone-900 px-4 py-3 text-xs uppercase tracking-[0.25em] text-white">Guardar</button>
              </div>
            </form>

            <section className="rounded-3xl border border-stone-200 bg-white p-6">
              <h2 className="text-3xl font-medium text-stone-950">Pedidos</h2>
              <div className="mt-4 space-y-3">
                {orders.length === 0 ? (
                  <p className="text-sm text-stone-500">No hay pedidos para este usuario.</p>
                ) : orders.map((order, index) => (
                  <article key={order.id ?? order.pedidoId ?? index} className="rounded-2xl border border-stone-200 p-3 text-sm text-stone-600">
                    <p className="font-medium text-stone-900">Pedido #{order.id ?? order.pedidoId ?? index + 1}</p>
                    <p>{order.estado ?? order.status ?? 'Sin estado'}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>

        {message ? <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p> : null}
      </main>
    </div>
  );
}

export default AdminDashboardPage;
