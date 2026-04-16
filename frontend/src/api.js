import axios from 'axios';

const api = axios.create({
    // ✅ 환경 변수만 사용 (하드코딩 제거)
    baseURL: process.env.REACT_APP_API_URL, 
    withCredentials: true // 구글 세션/쿠키 인증을 위해 필수
});

// [요청 인터셉터] 서버로 데이터를 보내기 직전 실행
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); 
    
    if (token && token !== 'undefined' && token !== 'null') {
        config.headers.Authorization = `Bearer ${token}`;
    } 
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// [응답 인터셉터] 401 에러 처리 등 기존 로직 유지
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error("❌ 인증 실패: 세션이 만료되었습니다.");
            localStorage.removeItem('token'); 
            const currentPath = window.location.pathname;
            const isAuthPage = currentPath === '/login' || currentPath.includes('/auth/callback');

            if (!isAuthPage) {
                alert("세션이 만료되었습니다. 다시 로그인해주세요.");
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;