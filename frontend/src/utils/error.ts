import { AxiosError } from 'axios';

export function getErrorMessage(error: any): string {
  const axiosErr = error as AxiosError<any>;
  const data = axiosErr?.response?.data as any;
  return (
    data?.message ||
    data?.error ||
    axiosErr?.message ||
    'Có lỗi xảy ra'
  );
}


