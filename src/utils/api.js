import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

const authHeaders = () => ({ headers: { authorization: localStorage.getItem('w4h.user.token') } });

export { api, authHeaders };
export default api;