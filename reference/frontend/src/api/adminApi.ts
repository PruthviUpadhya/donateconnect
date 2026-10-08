import { apiClient } from './client';
import { AdminStats, ApiResponse, NGOProfile } from '../types';

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await apiClient.get<ApiResponse<AdminStats>>('/admin/stats');
  return response.data.data;
};

export const getAllNgosAdmin = async (): Promise<NGOProfile[]> => {
  const response = await apiClient.get<ApiResponse<NGOProfile[]>>('/admin/ngo');
  return response.data.data;
};
