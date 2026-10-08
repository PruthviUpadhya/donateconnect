import { apiClient } from './client';
import { ApiResponse, CreateDonationRequest, Donation, DonationComment, DonationStatus, HealthStatus, PageResponse } from '../types';

export const getHealthStatus = async (): Promise<HealthStatus> => {
  try {
    const response = await apiClient.get<HealthStatus>('/health');
    if (typeof response.data === 'object' && response.data !== null && 'status' in response.data) {
      return response.data;
    }
    return { status: 'DOWN', service: 'DonateConnect Backend', timestamp: new Date().toISOString() };
  } catch {
    return { status: 'DOWN', service: 'DonateConnect Backend', timestamp: new Date().toISOString() };
  }
};

// Donor APIs
export const createDonation = async (dto: CreateDonationRequest): Promise<Donation> => {
  const response = await apiClient.post<ApiResponse<Donation>>('/donations', dto);
  return response.data.data;
};

export const getMyDonations = async (): Promise<Donation[]> => {
  const response = await apiClient.get<ApiResponse<Donation[]>>('/donations/mine');
  return response.data.data;
};

// NGO Role APIs
export const getNgoAssignedDonations = async (): Promise<Donation[]> => {
  const response = await apiClient.get<ApiResponse<Donation[]>>('/ngo/donations');
  return response.data.data;
};

export const updateDonationStatusByNgo = async (id: string, status: DonationStatus): Promise<Donation> => {
  const response = await apiClient.patch<ApiResponse<Donation>>(`/ngo/donations/${id}/status`, { status });
  return response.data.data;
};

// Donation Comments (Direct Messaging)
export const getDonationComments = async (donationId: string): Promise<DonationComment[]> => {
  const response = await apiClient.get<ApiResponse<DonationComment[]>>(`/donations/${donationId}/comments`);
  return response.data.data;
};

export const addDonationComment = async (donationId: string, message: string): Promise<DonationComment> => {
  const response = await apiClient.post<ApiResponse<DonationComment>>(`/donations/${donationId}/comments`, { message });
  return response.data.data;
};

// Admin Role APIs
export const getAdminDonations = async (
  category?: string,
  status?: string,
  ngoId?: string,
  page: number = 0,
  size: number = 10
): Promise<PageResponse<Donation>> => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (status) params.append('status', status);
  if (ngoId) params.append('ngoId', ngoId);
  params.append('page', page.toString());
  params.append('size', size.toString());

  const response = await apiClient.get<ApiResponse<PageResponse<Donation>>>(`/admin/donations?${params.toString()}`);
  return response.data.data;
};
