import React, { useEffect } from 'react';
import TopBarProgress from 'react-topbar-progress-indicator';
import { useLoadingProgress } from '@/hooks/useLoadingProgress';
import { usePathname } from 'next/navigation';

// Cấu hình cho thanh tiến trình
TopBarProgress.config({
    barColors: {
        '0': '#2196f3',
        '1.0': '#1976d2'
    },
    shadowBlur: 5
});

interface LoadingProgressProps {
    children: React.ReactNode;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ children }) => {
    const { loading, startLoading, stopLoading } = useLoadingProgress();
    const pathname = usePathname();

    useEffect(() => {
        // Bắt đầu loading khi pathname thay đổi
        startLoading();

        // Dừng loading sau một khoảng thời gian
        const timer = setTimeout(() => {
            stopLoading();
        }, 100);

        return () => clearTimeout(timer);
    }, [pathname]); // Thêm pathname vào dependencies

    return (
        <>
            {loading && <TopBarProgress />}
            {children}
        </>
    );
};

export default LoadingProgress; 