const configuredApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const apiBaseUrl = configuredApiUrl.replace(/\/api(?:\/clearance)?$/i, '');

export default apiBaseUrl;
