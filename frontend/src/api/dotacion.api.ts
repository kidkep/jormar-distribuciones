import apiClient from "./client";

export interface DotacionEmpresa {
  id: number;
  name: string;
  document: string | null;
  phone: string | null;
  contact_name: string | null;
  address: string | null;
  notes: string | null;
  employee_count: number;
  created_at: string;
  updated_at: string;
}

export interface DotacionProductBrief {
  id: number;
  name: string;
  sku: string | null;
}

export interface DotacionTalla {
  id: number;
  persona_id: number;
  product_id: number;
  size: string;
  color: string | null;
  notes: string | null;
  product: DotacionProductBrief | null;
  updated_at: string;
}

export interface DotacionHistorial {
  id: number;
  persona_id: number;
  product_id: number;
  size: string;
  color: string | null;
  quantity: number;
  note: string | null;
  dotacion_date: string;
  product: DotacionProductBrief | null;
}

export interface DotacionPersona {
  id: number;
  full_name: string;
  document: string | null;
  company_id: number | null;
  client_id: number | null;
  position: string | null;
  phone: string | null;
  notes: string | null;
  company_name: string | null;
  tallas: DotacionTalla[];
  historial: DotacionHistorial[];
  created_at: string;
  updated_at: string;
}

export interface DotacionResumenItem {
  product_id: number;
  product_name: string;
  sku: string | null;
  color: string | null;
  size: string;
  count: number;
}

export interface DotacionCatalogoProduct {
  id: number;
  name: string;
  sku: string | null;
  sale_price: number;
}

export interface DotacionCatalogo {
  products: DotacionCatalogoProduct[];
  sizes: string[];
  colors: string[];
}

export interface DotacionEmpresaCreate {
  name: string;
  document?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface DotacionPersonaCreate {
  full_name: string;
  document?: string | null;
  company_id?: number | null;
  client_id?: number | null;
  position?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface DotacionTallaUpsert {
  product_id: number;
  size: string;
  color?: string | null;
  notes?: string | null;
}

export interface DotacionHistorialCreate {
  product_id: number;
  size: string;
  color?: string | null;
  quantity: number;
  note?: string | null;
  dotacion_date?: string;
}

export interface QuoteAddItems {
  items: { product_id: number; quantity: number; unit_price: number }[];
}

export const dotacionApi = {  getCatalogo: async (): Promise<DotacionCatalogo> => {
    const response = await apiClient.get("/dotacion/catalogo");
    return response.data;
  },

  // Empresas
  listEmpresas: async (search = ""): Promise<DotacionEmpresa[]> => {
    const response = await apiClient.get("/dotacion/empresas", { params: { search } });
    return response.data;
  },
  createEmpresa: async (data: DotacionEmpresaCreate): Promise<DotacionEmpresa> => {
    const response = await apiClient.post("/dotacion/empresas", data);
    return response.data;
  },
  updateEmpresa: async (id: number, data: Partial<DotacionEmpresaCreate>): Promise<DotacionEmpresa> => {
    const response = await apiClient.put(`/dotacion/empresas/${id}`, data);
    return response.data;
  },
  deleteEmpresa: async (id: number): Promise<void> => {
    await apiClient.delete(`/dotacion/empresas/${id}`);
  },
  resumenEmpresa: async (id: number): Promise<DotacionResumenItem[]> => {
    const response = await apiClient.get(`/dotacion/empresas/${id}/resumen`);
    return response.data;
  },

  // Personas
  listPersonas: async (tipo: "personal" | "empresa" = "personal", search = "", companyId?: number): Promise<DotacionPersona[]> => {
    const response = await apiClient.get("/dotacion/personas", {
      params: { tipo, search, company_id: companyId },
    });
    return response.data;
  },
  getPersona: async (id: number): Promise<DotacionPersona> => {
    const response = await apiClient.get(`/dotacion/personas/${id}`);
    return response.data;
  },
  createPersona: async (data: DotacionPersonaCreate): Promise<DotacionPersona> => {
    const response = await apiClient.post("/dotacion/personas", data);
    return response.data;
  },
  updatePersona: async (id: number, data: Partial<DotacionPersonaCreate>): Promise<DotacionPersona> => {
    const response = await apiClient.put(`/dotacion/personas/${id}`, data);
    return response.data;
  },
  deletePersona: async (id: number): Promise<void> => {
    await apiClient.delete(`/dotacion/personas/${id}`);
  },

  // Tallas
  upsertTalla: async (personaId: number, data: DotacionTallaUpsert): Promise<DotacionTalla> => {
    const response = await apiClient.post(`/dotacion/personas/${personaId}/tallas`, data);
    return response.data;
  },
  deleteTalla: async (personaId: number, tallaId: number): Promise<void> => {
    await apiClient.delete(`/dotacion/personas/${personaId}/tallas/${tallaId}`);
  },

  // Historial
  addHistorial: async (personaId: number, data: DotacionHistorialCreate): Promise<DotacionHistorial> => {
    const response = await apiClient.post(`/dotacion/personas/${personaId}/historial`, data);
    return response.data;
  },
};