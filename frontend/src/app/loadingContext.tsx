"use client";

import React, { createContext, useState, useContext, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import TopBarProgress from 'react-topbar-progress-indicator';

// Cấu hình cho thanh tiến trình
TopBarProgress.config({
    barColors: {
        '0': '#2196f3',
        '1.0': '#1976d2'
    },
    shadowBlur: 5
});

interface LoadingContextType {
    isLoading: boolean;
    setLoading: (isLoading: boolean) => void;
    startLoading: () => void;
    stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
    isLoading: false,
    setLoading: () => { },
    startLoading: () => { },
    stopLoading: () => { }
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);

    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Theo dõi thay đổi URL để hiển thị loading khi chuyển trang
    useEffect(() => {
        // Không cần theo dõi lần đầu tải trang
        if (!isLoading) {
            setIsLoading(true);

            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [pathname, searchParams]);

    const setLoading = (loading: boolean) => {
        setIsLoading(loading);
    };

    const startLoading = () => {
        setIsLoading(true);
    };

    const stopLoading = () => {
        setTimeout(() => {
            setIsLoading(false);
        }, 500);
    };

    return (
        <LoadingContext.Provider value={{ isLoading, setLoading, startLoading, stopLoading }}>
            {isLoading && <TopBarProgress />}
            {children}
        </LoadingContext.Provider>
    );
};