
/**
 * Utility to get full photo URL from path
 */
export const getPhotoUrl = (photoPath: string | null | undefined): string => {
    if (!photoPath) return '';

    // If it's already a full URL, return as is
    if (photoPath.startsWith('http')) {
        return photoPath;
    }

    const cleanPhotoPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;

    // For web browser, using root-relative paths is most reliable when behind a proxy (Nginx/Ngrok)
    // This allows the browser to request from the same host/port the page is served from.
    if (typeof window !== 'undefined') {
        return cleanPhotoPath;
    }

    // Server-side or fallback: Get gateway URL from environment
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';
    if (!gatewayUrl) return cleanPhotoPath;

    const cleanGatewayUrl = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl;
    return `${cleanGatewayUrl}${cleanPhotoPath}`;
};
