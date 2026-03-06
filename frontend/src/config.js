// API_BASE_URL will use environment variable if exists (for production), 
// otherwise defaults to local IP (for internal testing)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.170:5000';

export default API_BASE_URL;
