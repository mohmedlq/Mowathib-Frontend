import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface ApiErrorResponse {
  message?: string;
  title?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  data: ApiErrorResponse | null;

  constructor(status: number, message: string, data: ApiErrorResponse | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
const Base_Urls={
  Local:'http://localhost:10000/api',
  Somee:'https://mowathib-api.somee.com/api'
}
const BASE_URL =Base_Urls.Local;

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token if available
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mowathib_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format errors and handle 401
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data = error.response.data as ApiErrorResponse | string;

      let message = `Request failed with status ${status}`;
      let errorData: ApiErrorResponse | null = null;

      if (typeof data === 'string') {
        message = data;
      } else if (data && typeof data === 'object') {
        errorData = data;
        message = data.message || data.title || message;
        if (data.errors) {
          const detailed = Object.values(data.errors).flat().join(', ');
          if (detailed) message = `${message}: ${detailed}`;
        }
      }

      if (status === 401) {
        window.dispatchEvent(new CustomEvent('mowathib_unauthorized'));
      }

      return Promise.reject(new ApiError(status, message, errorData));
    }

    const message = error.message || 'فشل الاتصال بالخادم، يرجى التحقق من تشغيل Backend';
    return Promise.reject(new ApiError(0, message, null));
  }
);

export const apiClient = {
  get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.get(url, { params, ...config }) as unknown as Promise<T>;
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.post(url, data, config) as unknown as Promise<T>;
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.put(url, data, config) as unknown as Promise<T>;
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return axiosInstance.delete(url, config) as unknown as Promise<T>;
  },

  raw: axiosInstance,
};
