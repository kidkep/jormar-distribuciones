import apiClient from "./client";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  task_type: string;
  client_id: number | null;
  client_name: string | null;
  user_id: number | null;
  assignee_name: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  task_type?: string;
  client_id?: number | null;
  user_id?: number | null;
  due_date?: string;
  priority?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  task_type?: string;
  client_id?: number | null;
  user_id?: number | null;
  due_date?: string | null;
  status?: string;
  priority?: string;
}

export const tasksApi = {
  list: async (page = 1, size = 50, status = "", search = ""): Promise<Task[]> => {
    const response = await apiClient.get("/tasks", { params: { page, size, status, search } });
    return response.data;
  },
  overdue: async (): Promise<{ id: number; title: string; description: string | null; due_date: string }[]> => {
    const response = await apiClient.get("/tasks/overdue");
    return response.data;
  },
  get: async (id: number): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${id}`);
    return response.data;
  },
  create: async (data: TaskCreate): Promise<Task> => {
    const response = await apiClient.post("/tasks", data);
    return response.data;
  },
  update: async (id: number, data: TaskUpdate): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
