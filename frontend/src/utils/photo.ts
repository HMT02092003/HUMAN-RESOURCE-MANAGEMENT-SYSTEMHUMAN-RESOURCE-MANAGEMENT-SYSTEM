
/**
 * Utility to get full photo URL from path
 */
export const getPhotoUrl = (photoPath: string | null | undefined): string => {
    if (!photoPath) return '';

    // If it's already a full URL, return as is
    if (photoPath.startsWith('http')) {
        return photoPath;
    }

    // Get gateway URL from environment
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';

    // Ensure we don't have double slashes if gatewayUrl has trailing slash or photoPath has leading slash
    const cleanGatewayUrl = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl;
    const cleanPhotoPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;

    return `${cleanGatewayUrl}${cleanPhotoPath}`;
};
