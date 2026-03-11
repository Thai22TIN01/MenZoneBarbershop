// API base URL - backend chạy tại localhost:3001
// Set VITE_API_URL trong .env nếu backend chạy port khác
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default API_BASE;
