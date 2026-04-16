import React, { useState } from 'react';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import styles from './Signup.module.css'; // CSS 모듈 임포트

const Signup = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const API_BASE_URL = process.env.REACT_APP_API_URL || '';

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirm) {
            return setError('비밀번호가 일치하지 않습니다.');
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: form.username,
                    password: form.password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('회원가입이 성공적으로 완료되었습니다! 로그인해 주세요.');
                navigate('/login');
            } else {
                setError(data.error || '회원가입 처리 중 오류가 발생했습니다.');
            }
        } catch (err) {
            setError('서버와 통신할 수 없습니다. 백엔드 서버를 확인하세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className={styles.container}>
            <Card className={styles.signupCard}>
                <div className={styles.topBar}></div>
                <Card.Body className={styles.cardBody}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>🥕 ReStock 회원가입</h2>
                        <p className="text-muted small">스마트한 재고 관리의 시작</p>
                    </div>

                    {error && (
                        <Alert variant="danger" className="py-2 small border-0 text-center mb-4">
                            {error}
                        </Alert>
                    )}

                    <Form onSubmit={handleSignup}>
                        <Form.Group className="mb-3">
                            <Form.Label className={styles.label}>아이디</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="사용할 아이디 입력" 
                                className={styles.inputField}
                                value={form.username} 
                                onChange={e => setForm({ ...form, username: e.target.value })} 
                                required 
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className={styles.label}>비밀번호</Form.Label>
                            <Form.Control 
                                type="password" 
                                placeholder="비밀번호 입력" 
                                className={styles.inputField}
                                value={form.password} 
                                onChange={e => setForm({ ...form, password: e.target.value })} 
                                required 
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className={styles.label}>비밀번호 확인</Form.Label>
                            <Form.Control 
                                type="password" 
                                placeholder="비밀번호 한 번 더 입력" 
                                className={styles.inputField}
                                value={form.confirm} 
                                onChange={e => setForm({ ...form, confirm: e.target.value })} 
                                required 
                            />
                        </Form.Group>

                        <Button 
                            type="submit" 
                            disabled={loading}
                            className={styles.submitButton}
                        >
                            {loading ? '처리 중...' : '가입하기'}
                        </Button>
                    </Form>

                    <div className="text-center mt-3">
                        <Link to="/login" className={styles.loginLink}>
                            이미 계정이 있으신가요? <span className={styles.highlightText}>로그인</span>
                        </Link>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Signup;