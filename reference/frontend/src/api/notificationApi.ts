import { apiClient } from './client';
import { ApiResponse, NotificationItem } from '../types';

export const getMyNotifications = async (): Promise<NotificationItem[]> => {
  const response = await apiClient.get<ApiResponse<NotificationItem[]>>('/notifications/mine');
  return response.data.data;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await apiClient.patch(`/notifications/${id}/read`);
};
