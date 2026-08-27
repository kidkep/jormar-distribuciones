import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { debtorsApi, type Debtor } from "@/api/debtors.api";
import { AlertCircle, DollarSign, Eye, XCircle } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Deudores</h1>
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          <strong>Total adeudado:</strong> {formatCurrency(totalDebt)}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Remision</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pagado</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : debtors.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  No hay deudores pendientes
                </td>
              </tr>
            ) : (
              debtors.map((d) => (
                <tr key={d.sale_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold">{d.invoice_number}</td>
                  <td className="px-4 py-3">{formatDate(d.sale_date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{d.client_name || "Sin cliente"}</div>
                    {d.client_document && <div className="text-xs text-gray-500">{d.client_document}</div>}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(Number(d.total))}</td>
                  <td className="px-4 py-3 text-green-600">{formatCurrency(Number(d.total_paid))}</td>
                  <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(Number(d.balance))}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setShowDetail(d)} className="rounded p-1 text-blue-600 hover:bg-blue-50">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setShowPayment(d); setPaymentAmount(Number(d.balance)); }}
                        className="flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Detalle - {showDetail.invoice_number}</h2>
              <button onClick={() => setShowDetail(null)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">Cliente:</span> {showDetail.client_name || "Sin cliente"}</div>
              <div><span className="text-gray-500">Fecha:</span> {formatDate(showDetail.sale_date)}</div>
              <div><span className="text-gray-500">Total:</span> {formatCurrency(Number(showDetail.total))}</div>
              <div><span className="text-gray-500">Saldo:</span> <span className="font-bold text-red-600">{formatCurrency(Number(showDetail.balance))}</span></div>
            </div>

            <h3 className="mb-2 text-sm font-semibold text-gray-700">Productos</h3>
            <table className="mb-4 w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-600">
                <tr><th className="px-2 py-2 text-left">Producto</th><th className="px-2 py-2 text-center">Cant</th><th className="px-2 py-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y">
                {showDetail.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2">{item.product_name}</td>
                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                    <td className="px-2 py-2 text-right">{formatCurrency(Number(item.total_price))}</td>
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
                        <td className="px-2 py-2">{formatDate(p.payment_date)}</td>
                        <td className="px-2 py-2 text-center capitalize">{p.payment_method}</td>
                        <td className="px-2 py-2 text-right text-green-600">{formatCurrency(Number(p.amount))}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">Registrar Abono</h2>
            <p className="mb-4 text-sm text-gray-600">
              Remision: <strong>{showPayment.invoice_number}</strong> | Saldo: <strong className="text-red-600">{formatCurrency(Number(showPayment.balance))}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Monto</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Metodo</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="efectivo">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="bancolombia">Bancolombia</option>
                  <option value="bogota">Banco de Bogota</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowPayment(null)} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button>
              <button
                onClick={() => paymentMutation.mutate({ saleId: showPayment.sale_id, amount: paymentAmount, payment_method: paymentMethod, notes: paymentNotes || undefined })}
                disabled={paymentAmount <= 0 || paymentAmount > Number(showPayment.balance) || paymentMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
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
