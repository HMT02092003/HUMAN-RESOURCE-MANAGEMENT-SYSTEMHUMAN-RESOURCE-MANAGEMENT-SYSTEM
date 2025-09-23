import type { Metadata } from "next";
import { ConfigProvider } from "antd";
import { LoadingProvider } from "@/components/loadingContext";
import "@/styles/globals.css";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: "HRMS - Human Resource Management System",
  description: "Modern HR Management System with microservices architecture",
  keywords: "HR, Human Resources, Management, Employee, Attendance",
  authors: [{ name: "HRMS Team" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#37afc7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1890ff',
              borderRadius: 6,
            },
            components: {
              Button: {
                borderRadius: 6,
                controlHeight: 28,
                fontSize: 13,
                paddingInline: 12,
              },
              Input: {
                borderRadius: 6,
                controlHeight: 32,
                fontSize: 14,
              },
            },
          }}
        >
          <LoadingProvider>
            {children}
          </LoadingProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
