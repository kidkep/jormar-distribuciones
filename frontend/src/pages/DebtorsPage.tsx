import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { debtorsApi, type Debtor } from "@/api/debtors.api";
import { AlertCircle, DollarSign, Eye, Download, X, Wallet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export function DebtorsPage() {
  const [showDetail, setShowDetail] = useState<Debtor | null>(null);
  const [showPayment, setShowPayment] = useState<Debtor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [paymentNotes, setPaymentNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: debtors = [], isLoading } = useQuery({
    queryKey: ["debtors"],
    queryFn: () => debtorsApi.list(1, 200),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ saleId, amount, payment_method, notes }: { saleId: number; amount: number; payment_method: string; notes?: string }) =>
      debtorsApi.registerPayment(saleId, { amount, payment_method, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debtors"] });
      queryClient.invalidateQueries({ queryKey: ["caja"] });
      setShowPayment(null);
      setPaymentAmount(0);
      setPaymentNotes("");
    },
  });

  const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);

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

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Wallet className="h-6 w-6 text-gold-600" />
            Deudores
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestión de cuentas por cobrar</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
          <DollarSign className="h-4 w-4" />
          <span><strong>Total adeudado:</strong> {formatCurrency(totalDebt)}</span>
        </div>
      </div>

      <div className="card-premium animate-scale-in overflow-x-auto p-0">
        <table className="table-premium w-full text-left text-sm">
          <thead className="text-xs uppercase">
            <tr>
              <th className="px-5 py-3">Remision</th>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Pagado</th>
              <th className="px-5 py-3">Saldo</th>
              <th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : debtors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  <AlertCircle className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                  No hay deudores pendientes
                </td>
              </tr>
            ) : (
              debtors.map((d) => (
                <tr key={d.sale_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-gold-700">{d.invoice_number}</td>
                  <td className="px-5 py-3.5 text-gray-600">{formatDate(d.sale_date)}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-800">{d.client_name || "Sin cliente"}</div>
                    {d.client_document && <div className="text-xs text-gray-500">{d.client_document}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-800">{formatCurrency(Number(d.total))}</td>
                  <td className="px-5 py-3.5 text-green-600 font-medium">{formatCurrency(Number(d.total_paid))}</td>
                  <td className="px-5 py-3.5 font-bold text-red-600">{formatCurrency(Number(d.balance))}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => setShowDetail(d)} className="rounded-lg p-1.5 text-gold-600 transition hover:bg-gold-50">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setShowPayment(d); setPaymentAmount(Number(d.balance)); }}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <DollarSign className="h-3 w-3" />
                        Abonar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detalle de deudor */}
      {showDetail && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-lg rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Detalle - <span className="font-mono text-gold-700">{showDetail.invoice_number}</span></h2>
              <div className="flex gap-2">
                <button onClick={() => downloadInvoice(showDetail.invoice_number)} className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50" title="Descargar remision">
                  <Download className="h-5 w-5" />
                </button>
                <button onClick={() => setShowDetail(null)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-4 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <strong className="text-gray-800">{showDetail.client_name || "Sin cliente"}</strong></div>
              <div><span className="text-gray-500">Fecha:</span> <strong className="text-gray-800">{formatDate(showDetail.sale_date)}</strong></div>
              <div><span className="text-gray-500">Total:</span> <strong className="text-gray-800">{formatCurrency(Number(showDetail.total))}</strong></div>
              <div><span className="text-gray-500">Saldo:</span> <strong className="text-red-600">{formatCurrency(Number(showDetail.balance))}</strong></div>
            </div>

            <h3 className="mb-2 text-sm font-semibold text-gray-700">Productos</h3>
            <table className="mb-4 w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-600">
                <tr><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-center">Cant</th><th className="px-2 py-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y">
                {showDetail.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2 font-mono text-xs font-bold text-gold-700">{item.sku} <span className="font-normal text-gray-700">{item.product_name}</span></td>
                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                    <td className="px-2 py-2 text-right text-gray-800">{formatCurrency(Number(item.total_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {showDetail.payments.length > 0 && (
              <>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Abonos</h3>
                <table className="w-full text-sm">
                  <thead className="border-b text-xs uppercase text-gray-600">
                    <tr><th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2">Metodo</th><th className="px-2 py-2 text-right">Monto</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {showDetail.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-2 py-2 text-gray-600">{formatDate(p.payment_date)}</td>
                        <td className="px-2 py-2 text-center capitalize">{p.payment_method}</td>
                        <td className="px-2 py-2 text-right text-emerald-600 font-medium">{formatCurrency(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal abono */}
      {showPayment && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-content w-full max-w-sm rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Registrar Abono</h2>
              <button onClick={() => setShowPayment(null)} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              <span><strong>Remisión:</strong> <span className="font-mono text-gold-700">{showPayment.invoice_number}</span></span>
              <span><strong>Saldo:</strong> <strong className="text-red-600">{formatCurrency(Number(showPayment.balance))}</strong></span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Monto</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Metodo</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-premium">
                  <option value="efectivo">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia</option>
                  <option value="bogota">Banco de Bogota</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Notas</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="input-premium" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowPayment(null)} className="btn-outline">Cancelar</button>
              <button
                onClick={() => paymentMutation.mutate({ saleId: showPayment.sale_id, amount: paymentAmount, payment_method: paymentMethod, notes: paymentNotes || undefined })}
                disabled={paymentAmount <= 0 || paymentAmount > Number(showPayment.balance) || paymentMutation.isPending}
                className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentMutation.isPending ? "Registrando..." : "Registrar Abono"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
