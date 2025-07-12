import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const useLoadingProgress = () => {
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Xử lý khi bắt đầu chuyển trang
        const handleStart = () => {
            setLoading(true);
        };

        // Xử lý khi kết thúc chuyển trang
        const handleComplete = () => {
            setTimeout(() => {
                setLoading(false);
            }, 100);
        };

        // Lắng nghe sự kiện chuyển trang
        window.addEventListener('beforeunload', handleStart);
        window.addEventListener('load', handleComplete);

        // Lắng nghe sự kiện click vào các link
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link && link.href && !link.href.includes('#')) {
                handleStart();
            }
        });

        // Lắng nghe sự kiện submit form
        document.addEventListener('submit', handleStart);

        // Lắng nghe sự kiện click vào các nút có class 'ant-btn-primary'
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.ant-btn-primary')) {
                handleStart();
            }
        });

        return () => {
            window.removeEventListener('beforeunload', handleStart);
            window.removeEventListener('load', handleComplete);
            document.removeEventListener('submit', handleStart);
        };
    }, [pathname]);

    // Thêm hàm để bắt đầu loading
    const startLoading = () => {
        setLoading(true);
    };

    // Thêm hàm để kết thúc loading
    const stopLoading = () => {
        setTimeout(() => {
            setLoading(false);
        }, 100);
    };

    return {
        loading,
        startLoading,
        stopLoading
    };
}; 