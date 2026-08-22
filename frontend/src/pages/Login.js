import React, { useState } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
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
                    <p className="text-muted small">내 물건의 등록부터 처리까지 한 흐름으로 관리하세요.</p>
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
                            autoComplete="username"
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
                            autoComplete="current-password"
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
                        type="button"
                        className={`w-100 ${styles.socialBtn} d-flex align-items-center justify-content-center mb-4`}
                        onClick={() => { window.location.href = `${API_BASE_URL}/oauth2/authorization/google`; }}
                    >
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" width="18" className="me-2" />
                        Google로 계속하기
                    </Button>
                </Form>

                <div className="text-center pt-2">
                    <p className="small text-muted mb-0">
                        아직 회원이 아니신가요?{' '}
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
