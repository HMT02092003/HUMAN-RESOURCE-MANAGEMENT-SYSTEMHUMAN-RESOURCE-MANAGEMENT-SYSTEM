import type { Metadata } from "next";
import { ConfigProvider } from "antd";
import dayjs from 'dayjs';
// plugins required by some antd/rc-picker internals
import weekday from 'dayjs/plugin/weekday';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { LoadingProvider } from "@/components/loadingContext";
import "@/styles/globals.css";
import "@/styles/admin.css";
import dynamic from 'next/dynamic';
const DayjsSetup = dynamic(() => import('@/components/DayjsSetup'), { ssr: false });

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
  // Ensure dayjs has the plugins rc-picker expects (weekday is required by rc-picker internals)
  // Do not re-extend if already extended to avoid duplicate registrations during HMR
  try {
    // @ts-ignore
    if (!dayjs.prototype.weekday) {
      dayjs.extend(weekday);
    }
  } catch (e) {
    // In some build environments dayjs.prototype may be frozen; safe-guard and continue
    // eslint-disable-next-line no-console
    console.warn('Could not extend dayjs with weekday plugin', e);
  }
  // other useful plugins used elsewhere in the app
  try { if (!dayjs.prototype.utc) dayjs.extend(utc); } catch (e) {}
  try { if (!dayjs.prototype.format) dayjs.extend(customParseFormat); } catch (e) {}
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
              <DayjsSetup />
            {children}
          </LoadingProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
