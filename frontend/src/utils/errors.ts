import axios from 'axios';

export const extractErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const message = (data as { message?: string; error?: string }).message;
      if (message) return message;
      const errorText = (data as { error?: string }).error;
      if (errorText) return errorText;
    }
    if (typeof error.message === 'string' && error.message) {
      return error.message;
    }
  }
  return fallback;
};
