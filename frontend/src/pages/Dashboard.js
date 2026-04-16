import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Badge, Card, Row, Col, Button, Spinner, Container } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api'; 
import AiChat from './AiChat'; 
import styles from './Dashboard.module.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const API_BASE_URL = process.env.REACT_APP_API_URL || "";
    
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    // 현재 선택된 필터 상태 (all, urgent, processing, finished)
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        if (token) {
            localStorage.setItem('token', token);
            navigate('/dashboard', { replace: true });
        }
    }, [location, navigate]);

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const res = await api.get('/api/inventory');
            setInventory(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("데이터 로딩 실패:", err);
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getDDay = (expiryDate) => {
        if (!expiryDate) return 999;
        const today = new Date().setHours(0, 0, 0, 0);
        const target = new Date(expiryDate).setHours(0, 0, 0, 0);
        return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    };

    // 데이터 분류 로직
    const expiredItems = inventory.filter(item => item.timeType === 'EXPIRATION' && getDDay(item.expiryDate) < 0);
    const urgentItems = inventory.filter(item => item.timeType === 'EXPIRATION' && getDDay(item.expiryDate) >= 0 && getDDay(item.expiryDate) <= 3);
    const processingAgingItems = inventory.filter(item => item.timeType === 'AGING' && getDDay(item.expiryDate) > 0); 
    const finishedAgingItems = inventory.filter(item => item.timeType === 'AGING' && getDDay(item.expiryDate) <= 0); 

    // 카드 클릭에 따른 필터링된 목록 생성
    const filteredList = useMemo(() => {
        let list = [];
        if (filterType === 'urgent') {
            list = [...expiredItems, ...urgentItems];
        } else if (filterType === 'processing') {
            list = processingAgingItems;
        } else if (filterType === 'finished') {
            list = finishedAgingItems;
        } else {
            // 'all'인 경우 최근 입고 순 5개만 표시
            return [...inventory].sort((a, b) => b.id - a.id).slice(0, 5);
        }
        return list.sort((a, b) => b.id - a.id);
    }, [filterType, inventory, expiredItems, urgentItems, processingAgingItems, finishedAgingItems]);

    const handleUrlClick = (url) => {
        if (url) {
            const targetUrl = url.startsWith('http') ? url : `https://${url}`;
            window.open(targetUrl, '_blank');
        } else {
            alert('등록된 처리 사이트 URL이 없습니다.');
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{height: '100vh', background: '#fcfcfc'}}>
            <Spinner animation="grow" variant="warning" />
        </div>
    );

    return (
        <Container fluid className={styles.dashboardContainer}>
            <Row>
                <Col lg={8} xl={9}>
                    <div className={styles.headerSection}>
                        <h2 className={styles.dashboardTitle}>📊 재고 관제 센터</h2>
                        <span className={styles.subtitle}>카드를 클릭하여 상태별 품목을 빠르게 필터링하세요.</span>
                    </div>

                    <div className={styles.statGrid}>
                        <div 
                            className={`${styles.statCard} ${filterType === 'all' ? styles.activeCard : ''}`} 
                            onClick={() => setFilterType('all')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.statLabel}>전체 관리 품목</div>
                            <div className={styles.statValue}>
                                {inventory.length} <span className={styles.statUnit}>개</span>
                            </div>
                        </div>

                        <div 
                            className={`${styles.statCard} ${filterType === 'urgent' ? styles.activeUrgent : ''}`} 
                            onClick={() => setFilterType('urgent')}
                            style={{ cursor: 'pointer', borderLeft: '4px solid #ff4d4d' }}
                        >
                            <div className={`${styles.statLabel} text-danger`}>폐기/임박 주의</div>
                            <div className={`${styles.statValue} text-danger`}>
                                {expiredItems.length + urgentItems.length} <span className={styles.statUnit}>건</span>
                            </div>
                        </div>

                        <div 
                            className={`${styles.statCard} ${filterType === 'processing' ? styles.activePrimary : ''}`} 
                            onClick={() => setFilterType('processing')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={`${styles.statLabel} text-primary`}>현재 숙성 중</div>
                            <div className={`${styles.statValue} text-primary`}>
                                {processingAgingItems.length} <span className={styles.statUnit}>건</span>
                            </div>
                        </div>

                        <div 
                            className={`${styles.statCard} ${filterType === 'finished' ? styles.activeSuccess : ''}`} 
                            onClick={() => setFilterType('finished')}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={styles.statLabel}>✨ 숙성 완료</div>
                            <div className={styles.statValue}>
                                {finishedAgingItems.length} <span className={styles.statUnit}>건</span>
                            </div>
                        </div>
                    </div>

                    <Card className={styles.contentCard}>
                        <div className={styles.cardHeader} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h5 className={styles.tableTitle} style={{margin: 0}}>
                                {filterType === 'all' ? '📦 최근 입고 현황' : 
                                 filterType === 'urgent' ? '🚨 폐기/임박 품목 리스트' : 
                                 filterType === 'processing' ? '⏳ 숙성 진행 중 리스트' : '✅ 숙성 완료 품목 리스트'}
                            </h5>
                            
                            {/* 📍 필터에 따른 버튼 분기 로직 복구 */}
                            {filterType === 'all' ? (
                                <Button 
                                    variant="link" 
                                    className="text-decoration-none p-0 text-muted" 
                                    style={{fontSize: '0.9rem'}}
                                    onClick={() => navigate('/inventory')}
                                >
                                    전체보기 〉
                                </Button>
                            ) : (
                                <Button 
                                    variant="outline-secondary" 
                                    size="sm" 
                                    className="rounded-pill" 
                                    onClick={() => setFilterType('all')}
                                >
                                    필터 해제
                                </Button>
                            )}
                        </div>
                        <Table hover responsive className={styles.recentTable}>
                            <thead>
                                <tr>
                                    <th>품목 상세</th>
                                    <th>기한/상태</th>
                                    <th>액션</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.length > 0 ? (
                                    filteredList.map(item => {
                                        const dday = getDDay(item.expiryDate);
                                        return (
                                            <tr key={item.id}>
                                                <td className="ps-4">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="position-relative">
                                                            <img 
                                                                src={item.imageUrl ? `${API_BASE_URL}${item.imageUrl}` : "/default.png"} 
                                                                className="rounded-3 shadow-sm" 
                                                                style={{ width: '40px', height: '40px', objectFit: 'cover' }} 
                                                                onError={(e) => e.target.src = "/default.png"}
                                                                alt="" 
                                                            />
                                                            {item.autoDelete && <Badge bg="danger" className="position-absolute top-0 start-0 translate-middle p-1 rounded-circle" style={{width:'8px', height:'8px'}}></Badge>}
                                                        </div>
                                                        <div className="text-start">
                                                            <div className="fw-bold" style={{fontSize: '0.95rem'}}>{item.name}</div>
                                                            <small className="text-muted">{item.location} | {item.stock}개</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <Badge bg={dday < 0 ? "dark" : dday <= 3 ? "danger" : "info"} className="rounded-pill">
                                                        {dday < 0 ? "만료" : `D-${dday}`}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Button 
                                                        variant="outline-dark" size="sm" className="rounded-pill px-3"
                                                        onClick={() => handleUrlClick(item.customUrl)}
                                                    >
                                                        🚀 {item.serviceName || '처분'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-5 text-center text-muted">해당 조건에 맞는 품목이 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Col>

                <Col lg={4} xl={3}>
                    <div className="sticky-top" style={{ top: '2.5rem' }}>
                        <AiChat />
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Dashboard;