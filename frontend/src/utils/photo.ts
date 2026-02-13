
/**
 * Utility to get full photo URL from path
 */
export const getPhotoUrl = (photoPath: string | null | undefined): string => {
    if (!photoPath) return '';

    // If it's already a full URL, return as is
    if (photoPath.startsWith('http')) {
        return photoPath;
    }

    // Determine the base path. 
    // If it's just a filename (no slashes), we assume it's in the identificationPhoto folder.
    let cleanPhotoPath = photoPath;
    if (!photoPath.includes('/') && !photoPath.includes('\\')) {
        cleanPhotoPath = `/identificationPhoto/${photoPath}`;
    } else {
        cleanPhotoPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    }

    // Always use the gateway URL since images are stored in the backend service
    // and not statically served by the Next.js frontend


    // Server-side or fallback: Get gateway URL from environment
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '';
    if (!gatewayUrl) return cleanPhotoPath;

    const cleanGatewayUrl = gatewayUrl.endsWith('/') ? gatewayUrl.slice(0, -1) : gatewayUrl;
    return `${cleanGatewayUrl}${cleanPhotoPath}`;
};
