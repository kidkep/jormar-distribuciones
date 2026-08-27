import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesApi, type Sale, type SaleCreate } from "@/api/sales.api";
import { productsApi, type Product } from "@/api/products.api";
import { clientsApi, type Client } from "@/api/clients.api";
import { Plus, Search, Eye, XCircle, ShoppingCart, Trash2, Download, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type CartItem = {
  product: Product;
  quantity: number;
  unit_price: number;
};

export function SalesPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Sale | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saleError, setSaleError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", search],
    queryFn: () => salesApi.list(1, 200, search),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(1, 200, productSearch),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.list(1, 200),
  });

  const createMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSaleError(null);
      resetForm();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || error?.message || "Error al crear la venta";
      setSaleError(msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: salesApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setShowDetail(null);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setCart([]);
    setClientId(null);
    setPaymentMethod("efectivo");
    setDiscount(0);
    setNotes("");
    setDeliveryAddress("");
    setDeliveredBy("");
    setProductSearch("");
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, unit_price: product.sale_price }]);
    }
    setProductSearch("");
  };

  const updateCartItem = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.product.id !== productId));
    } else {
      setCart(cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const downloadInvoice = async (invoiceNumber: string) => {
    const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
    const token = localStorage.getItem("token");
    const res = await fetch(`${baseUrl}/sales/download/${invoiceNumber}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal - discount;

  const handleSubmit = () => {
    if (cart.length === 0) return;
    createMutation.mutate({
      client_id: clientId,
      payment_method: paymentMethod,
      discount,
      notes: notes || undefined,
      delivery_address: deliveryAddress || undefined,
      delivered_by: deliveredBy || undefined,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    });
  };

  const filteredProducts = products.filter(
    (p) =>
      p.is_active &&
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <button
          onClick={() => { resetForm(); setSaleError(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Venta
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por numero de factura..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Factura</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Metodo Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay ventas registradas</td></tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{s.invoice_number}</td>
                  <td className="px-4 py-3">{formatDate(s.sale_date)}</td>
                  <td className="px-4 py-3">{s.client?.name || "Sin cliente"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(Number(s.total))}</td>
                  <td className="px-4 py-3 capitalize">{s.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${s.status === "pagada" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setShowDetail(s)} className="rounded p-1 text-blue-600 hover:bg-blue-50">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => downloadInvoice(s.invoice_number)} className="rounded p-1 text-green-600 hover:bg-green-50" title="Descargar PDF">
                        <Download className="h-4 w-4" />
                      </button>
                      {s.status === "pagada" && (
                        <button onClick={() => cancelMutation.mutate(s.id)} className="rounded p-1 text-red-600 hover:bg-red-50">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Formulario nueva venta */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-10">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">Nueva Venta</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
                <select
                  value={clientId || ""}
                  onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Sin cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Metodo de Pago</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="efectivo">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia</option>
                  <option value="bogota">Banco de Bogota</option>
                  <option value="credito">Credito</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Direccion de Entrega</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Direccion donde se entrega"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Quien Entrega</label>
                <input
                  type="text"
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Nombre de quien entrega"
                />
              </div>
            </div>

            {/* Buscar producto */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
              />
              {productSearch && filteredProducts.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                  {filteredProducts.slice(0, 10).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span>{p.sku} - {p.name}</span>
                      <span className="text-gray-500">{formatCurrency(Number(p.sale_price))} | Stock: {p.current_stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Carrito */}
            {cart.length > 0 && (
              <div className="mb-4">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-2 py-2 text-left">Producto</th>
                      <th className="px-2 py-2 text-center">Cant</th>
                      <th className="px-2 py-2 text-right">Precio U.</th>
                      <th className="px-2 py-2 text-right">Subtotal</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cart.map((item) => (
                      <tr key={item.product.id}>
                        <td className="px-2 py-2">{item.product.name}</td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            min={1}
                            onChange={(e) => updateCartItem(item.product.id, Number(e.target.value))}
                            className="w-16 rounded border px-2 py-1 text-center text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) =>
                              setCart(cart.map((c) =>
                                c.product.id === item.product.id ? { ...c, unit_price: Number(e.target.value) } : c
                              ))
                            }
                            className="w-24 rounded border px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.unit_price * item.quantity)}</td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totales */}
            <div className="mb-4 flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded border px-2 py-1 text-right text-sm" />
                </div>
                <div className="flex justify-between border-t pt-1 text-base font-bold"><span>Total:</span><span>{formatCurrency(total)}</span></div>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Observaciones</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={resetForm} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={cart.length === 0 || createMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Procesando..." : "Confirmar Venta"}
              </button>
            </div>
            {saleError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{saleError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detalle de venta */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{showDetail.invoice_number}</h2>
              <div className="flex gap-2">
                <button onClick={() => downloadInvoice(showDetail.invoice_number)} className="text-green-600 hover:text-green-700" title="Descargar PDF">
                  <Download className="h-5 w-5" />
                </button>
                <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Fecha:</span> {formatDate(showDetail.sale_date)}</div>
              <div><span className="text-gray-500">Cliente:</span> {showDetail.client?.name || "Sin cliente"}</div>
              <div><span className="text-gray-500">Pago:</span> {showDetail.payment_method}</div>
              <div><span className="text-gray-500">Estado:</span> {showDetail.status}</div>
              {showDetail.delivery_address && (
                <div className="col-span-2"><span className="text-gray-500">Direccion de entrega:</span> {showDetail.delivery_address}</div>
              )}
              {showDetail.delivered_by && (
                <div className="col-span-2"><span className="text-gray-500">Entregado por:</span> {showDetail.delivered_by}</div>
              )}
            </div>
            <table className="mb-4 w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-2 py-2 text-left">Producto</th>
                  <th className="px-2 py-2 text-center">Cant</th>
                  <th className="px-2 py-2 text-right">Precio</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {showDetail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-2 py-2">{item.product?.name || `Producto #${item.product_id}`}</td>
                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(Number(item.unit_price))}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(Number(item.total_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end text-sm">
              <div className="w-48 space-y-1">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(Number(showDetail.subtotal))}</span></div>
                {Number(showDetail.discount) > 0 && (
                  <div className="flex justify-between"><span>Descuento:</span><span>-{formatCurrency(Number(showDetail.discount))}</span></div>
                )}
                <div className="flex justify-between border-t pt-1 font-bold"><span>Total:</span><span>{formatCurrency(Number(showDetail.total))}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
