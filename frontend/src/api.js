import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
    baseURL,
    withCredentials: true
});

const attachAuth = (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

api.interceptors.request.use(attachAuth, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('인증 실패: 세션이 만료되었습니다.');
            localStorage.removeItem('token');
            const currentPath = window.location.pathname;
            const isAuthPage = currentPath === '/login' || currentPath.includes('/auth/callback');

            if (!isAuthPage) {
                alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
