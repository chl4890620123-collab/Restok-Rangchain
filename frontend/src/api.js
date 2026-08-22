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

// 기존 Inbound 화면이 axios로 FastAPI localhost:8000을 직접 호출하던 경로를
// Spring AI Gateway로 투명하게 전환한다. 화면 전체를 깨뜨리지 않으면서
// 브라우저 -> Spring Boot -> FastAPI 구조로 마이그레이션하기 위한 호환 레이어다.
axios.interceptors.request.use((config) => {
    if (typeof config.url === 'string' && config.url.includes('localhost:8000/api/ai/analyze-receipt')) {
        config.url = `${baseURL}/api/ai/analyze-receipt`;
        return attachAuth(config);
    }
    return config;
}, (error) => Promise.reject(error));

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
