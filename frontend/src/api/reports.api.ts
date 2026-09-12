const extractFilename = (disposition: string, fallback: string) => {
  const match = disposition.match(/filename="?([^";]+)"?/);
  return match ? match[1] : fallback;
};

export const downloadReport = async (fechaInicio = "", fechaFin = "") => {
  const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
  const token = localStorage.getItem("token");
  const params = new URLSearchParams();
  if (fechaInicio) params.set("fecha_inicio", fechaInicio);
  if (fechaFin) params.set("fecha_fin", fechaFin);
  const qs = params.toString();

  const res = await fetch(`${baseUrl}/reports/download${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Error al generar el informe (${res.status})`);

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const filename = extractFilename(disposition, "informe_gestion_jormar.docx");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};