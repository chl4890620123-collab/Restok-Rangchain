import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css'; // CSS 모듈 임포트

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); // 에러 초기화

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ 서버가 응답한 JWT 토큰 저장 (이것이 헤더에 실려야 함)
                localStorage.setItem('token', data.token);
                // 필요하다면 사용자 이름도 저장 가능
                localStorage.setItem('username', username);
                
                navigate('/'); 
            } else {
                setError(data.error || '아이디 또는 비밀번호를 확인해주세요.');
            }
        } catch (err) {
            console.error('로그인 에러:', err);
            setError('서버와 통신할 수 없습니다. 네트워크 상태를 확인하세요.');
        }
    };

    return (
        <div className={styles.loginWrapper}>
            <Card className={styles.loginCard}>
                <div className={styles.topAccent}></div>
                
                <div className="text-center mb-5 mt-3">
                    <h2 className={styles.brandTitle}>🥕 ReStock</h2>
                    <p className="text-muted small">안전한 재고 관리를 위해 로그인하세요</p>
                </div>

                {error && (
                    <Alert variant="danger" className="py-2 small border-0 text-center mb-4 rounded-4 shadow-sm">
                        {error}
                    </Alert>
                )}

                <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                        <Form.Control 
                            type="text" 
                            placeholder="아이디" 
                            className={styles.nmInput}
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                            autoComplete="username" // ✅ 자동완성 속성 추가
                        />
                    </Form.Group>
                    <Form.Group className="mb-4">
                        <Form.Control 
                            type="password" 
                            placeholder="비밀번호" 
                            className={styles.nmInput}
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            autoComplete="current-password" // ✅ 자동완성 속성 추가
                        />
                    </Form.Group>
                    
                    <Button type="submit" className={`w-100 ${styles.loginBtn} mb-2`}>
                        로그인
                    </Button>
                    
                    <div className={styles.divider}>
                        <div className={styles.line}></div>
                        <span className="mx-3">소셜 로그인</span>
                        <div className={styles.line}></div>
                    </div>
                    
                    <Button 
                        type="button" // 서브밋 방지
                        className={`w-100 ${styles.socialBtn} d-flex align-items-center justify-content-center mb-4`} 
                        onClick={() => window.location.href=`${process.env.REACT_APP_API_URL}/oauth2/authorization/google`}
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="18" className="me-2" />
                        Google로 계속하기
                    </Button>
                </Form>

                <div className="text-center pt-2">
                    <p className="small text-muted mb-0">
                        아직 회원이 아니신가요? {' '}
                        <span onClick={() => navigate('/signup')} className={styles.signupLink}>
                            회원가입
                        </span>
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Login;