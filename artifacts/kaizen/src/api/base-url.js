export const apiBase = import.meta.env.VITE_API_BASE_PATH || '/api/v1';
export const publicAsset = (name) => `${import.meta.env.BASE_URL}${name}`;
