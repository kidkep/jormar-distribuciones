import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, type Purchase } from "@/api/purchases.api";
import { productsApi, type Product } from "@/api/products.api";
import { suppliersApi, type Supplier } from "@/api/suppliers.api";
import { Plus, Search, Eye, XCircle, ShoppingCart, Trash2, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type CartItem = {
  product: Product;
  quantity: string;
  cost_price: number;
};

export function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Purchase | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", search],
    queryFn: () => purchasesApi.list(1, 200, search),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(1, 1000),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => suppliersApi.list(1, 1000),
  });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-payable"] });
      setPurchaseError(null);
      resetForm();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || error?.message || "Error al crear la compra";
      setPurchaseError(msg);
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setCart([]);
    setSupplierId(null);
    setSupplierName("");
    setDiscount(0);
    setNotes("");
    setProductSearch("");
  };

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: String(Number(item.quantity) + 1) }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: "1", cost_price: Number(product.purchase_price) || 0 }]);
    }
    setProductSearch("");
  };

  const updateCartItem = (productId: number, quantity: string) => {
    setCart(cart.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.cost_price * (Number(item.quantity) || 0), 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  const handleSubmit = () => {
    if (cart.length === 0) return;
    createMutation.mutate({
      supplier_id: supplierId,
      supplier_name: supplierName || null,
      discount: discountAmount,
      notes: notes || undefined,
      items: cart.map((item) => ({
        product_id: item.product.id,
        quantity: Number(item.quantity),
        cost_price: item.cost_price,
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
        <h1 className="text-2xl font-bold text-gray-900">Compras / Ordenes de Compra</h1>
        <button
          onClick={() => { resetForm(); setPurchaseError(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nueva Compra
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por numero de orden..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Orden</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay compras registradas</td></tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{p.order_number}</td>
                  <td className="px-4 py-3">{formatDate(p.purchase_date)}</td>
                  <td className="px-4 py-3">{p.supplier_name || "Sin proveedor"}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(Number(p.total))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      p.status === "pagada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setShowDetail(p)} className="rounded p-1 text-blue-600 hover:bg-blue-50">
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-10">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">Nueva Compra</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Proveedor</label>
                <select
                  value={supplierId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : null;
                    const sup = suppliers.find((s) => s.id === id);
                    setSupplierId(id);
                    setSupplierName(sup?.name || "");
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

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
                      <span className="text-gray-500">{formatCurrency(Number(p.purchase_price))} | Stock: {p.current_stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="mb-4">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-2 py-2 text-left">Producto</th>
                      <th className="px-2 py-2 text-center">Cant</th>
                      <th className="px-2 py-2 text-right">Costo U.</th>
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
                            type="text"
                            inputMode="numeric"
                            value={item.quantity}
                            onChange={(e) => updateCartItem(item.product.id, e.target.value)}
                            className="w-16 rounded border px-2 py-1 text-center text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.cost_price}
                            onChange={(e) =>
                              setCart(cart.map((c) =>
                                c.product.id === item.product.id ? { ...c, cost_price: Number(e.target.value) } : c
                              ))
                            }
                            className="w-24 rounded border px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-medium">{formatCurrency(item.cost_price * (Number(item.quantity) || 0))}</td>
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

            <div className="mb-4 flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between">
                  <span>Descuento (%):</span>
                  <input type="text" inputMode="decimal" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded border px-2 py-1 text-right text-sm" placeholder="0" />
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
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {createMutation.isPending ? "Procesando..." : "Registrar Compra"}
              </button>
            </div>
            {purchaseError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{purchaseError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{showDetail.order_number}</h2>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Fecha:</span> {formatDate(showDetail.purchase_date)}</div>
              <div><span className="text-gray-500">Proveedor:</span> {showDetail.supplier_name || "Sin proveedor"}</div>
            </div>
            <table className="mb-4 w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-2 py-2 text-left">Producto</th>
                  <th className="px-2 py-2 text-center">Cant</th>
                  <th className="px-2 py-2 text-right">Costo</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {showDetail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-2 py-2">{item.product_name || `Producto #${item.product_id}`}</td>
                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(Number(item.cost_price))}</td>
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
