
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://armapi.qubyt.codes';

export const getFileUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // Ensure clean join
    const cleanBase = BASE_URL?.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
};
