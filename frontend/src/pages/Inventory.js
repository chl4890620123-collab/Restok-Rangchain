import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, InputGroup, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../api'; 
import styles from './Inventory.module.css'; 
import AiChat from './AiChat';

const API_BASE_URL = process.env.REACT_APP_API_URL || "";

const Inventory = () => {
    const navigate = useNavigate();
    
    const [inventory, setInventory] = useState([]);
    const [serviceList, setServiceList] = useState([]); 
    const [userCategories, setUserCategories] = useState([]); 
    const [filteredItems, setFilteredItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); 
    
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [categoryFilter, setCategoryFilter] = useState("ALL");

    const categories = useMemo(() => {
        const baseCats = Array.isArray(userCategories) ? userCategories : [];
        const dbCats = inventory.map(item => item.category).filter(Boolean);
        return ["ALL", ...new Set([...baseCats, ...dbCats])];
    }, [inventory, userCategories]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const fetchInv = api.get('/api/inventory').catch(err => {
                console.error("재고 로드 실패:", err);
                return { data: [] };
            });
            const fetchSvc = api.get('/api/services').catch(err => {
                console.error("서비스 로드 실패:", err);
                return { data: [] };
            });
            const fetchSettings = api.get('/api/user-settings').catch(err => {
                console.error("사용자 설정 로드 실패:", err);
                return { data: { categories: [] } };
            });

            const [invRes, svcRes, settingsRes] = await Promise.all([fetchInv, fetchSvc, fetchSettings]);

            setInventory(invRes.data || []);
            setServiceList(svcRes.data || []);
            setUserCategories(settingsRes.data.categories || []);
            
        } catch (error) {
            console.error("전체 데이터 로드 중 예상치 못한 오류:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    useEffect(() => {
        let result = [...inventory];
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(item => 
                (item.name?.toLowerCase().includes(lowerSearch)) ||
                (item.location?.toLowerCase().includes(lowerSearch)) ||
                (item.category?.toLowerCase().includes(lowerSearch))
            );
        }
        if (statusFilter !== "ALL") result = result.filter(item => item.status === statusFilter);
        if (categoryFilter !== "ALL") result = result.filter(item => item.category === categoryFilter);
        setFilteredItems(result);
    }, [searchTerm, statusFilter, categoryFilter, inventory]);

    const getImageUrl = (path) => {
        if (!path) return "/default.png";
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_BASE_URL}${cleanPath}`;
    };

    const getDisplayServiceName = (item) => {
        const sName = item.serviceName || item.service_name;
        if (sName && String(sName).trim() !== "" && sName !== "일반") return sName;
        const rawUrl = item.customUrl || item.sourceUrl;
        if (rawUrl && serviceList.length > 0) {
            const matched = serviceList.find(s => s.url === rawUrl);
            if (matched) return matched.name;
        }
        return "서비스 이동";
    };

    const renderDDayBadge = (item) => {
        const { expiryDate, timeType } = item;
        if (!expiryDate) return null;
        const targetDate = new Date(expiryDate).setHours(0,0,0,0);
        const today = new Date().setHours(0,0,0,0);
        const diff = Math.ceil((targetDate - today) / (1000*60*60*24));
        
        if (timeType === 'AGING' || timeType === '숙성') {
            return (
                <Badge bg={diff > 0 ? "primary" : "success"} className="rounded-pill px-2 shadow-sm border-0">
                    {diff > 0 ? `🧪 숙성 D-${diff}` : `✨ 숙성 완료`}
                </Badge>
            );
        }
        return (
            <Badge bg={diff < 0 ? "dark" : diff <= 3 ? "danger" : "info"} className="rounded-pill px-2 shadow-sm border-0">
                {diff < 0 ? '만료' : diff === 0 ? 'Day' : `D-${diff}`}
            </Badge>
        );
    };

    // 추가된 URL 이동 핸들러
    const handleUrlClick = (e, url) => {
        e.stopPropagation(); // 카드/행 클릭 이벤트 방지
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <Spinner animation="border" variant="warning" />
        </div>
    );

    return (
        <div className={styles.container}>
            <Container fluid className="p-4">
                <header className="d-flex justify-content-between align-items-center mb-4">
                    <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <h3 className="fw-bold m-0" style={{ color: '#ff8a3d' }}>
                            RE<span className="text-dark">STOCK</span>
                        </h3>
                    </div>
                    <div className="d-flex gap-3">
                        <InputGroup className="shadow-sm rounded-pill overflow-hidden border-0" style={{ maxWidth: '300px' }}>
                            <Form.Control 
                                placeholder="품목명, 위치 검색..." 
                                className="bg-white border-0 px-3 shadow-none" 
                                onChange={e => setSearchTerm(e.target.value)} 
                            />
                        </InputGroup>
                        <div className="bg-light p-1 rounded-3 d-flex gap-1 shadow-sm">
                            <Button variant={viewMode === 'grid' ? 'white' : 'transparent'} className={`border-0 px-2 py-1 shadow-none ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`} onClick={() => setViewMode('grid')}>🔳</Button>
                            <Button variant={viewMode === 'list' ? 'white' : 'transparent'} className={`border-0 px-2 py-1 shadow-none ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`} onClick={() => setViewMode('list')}>📋</Button>
                        </div>
                    </div>
                </header>

                <Row>
                    <Col lg={8} xl={9}>
                        <div className="mb-4">
                            <div className={styles.filterGroup + " mb-3"}>
                                {['ALL', '정상', '파손', '폐기'].map(status => (
                                    <Button key={status} 
                                        className={`${styles.filterBtn} 
                                            ${status === 'ALL' ? styles.btnAll : status === '정상' ? styles.btnNormal : status === '파손' ? styles.btnWarning : styles.btnDanger} 
                                            ${statusFilter === status ? styles.active : ''}`}
                                        onClick={() => setStatusFilter(status)}>
                                        {status === 'ALL' ? '전체상태' : status}
                                    </Button>
                                ))}
                            </div>
                            
                            <div className="d-flex gap-2 overflow-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                                {categories.map(cat => (
                                    <Button key={cat} 
                                        variant={categoryFilter === cat ? "orange" : "light"}
                                        style={{ 
                                            backgroundColor: categoryFilter === cat ? '#ff8a3d' : '#f8f9fa', 
                                            color: categoryFilter === cat ? 'white' : '#666'
                                        }}
                                        className="rounded-pill px-3 border-0 fw-bold shadow-sm text-nowrap"
                                        onClick={() => setCategoryFilter(cat)}>
                                        # {cat}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="text-center py-5 text-muted bg-light rounded-4">
                                <p className="mb-0">검색 결과가 없거나 데이터가 비어있습니다.</p>
                            </div>
                        ) : (
                            viewMode === 'grid' ? (
                                <Row className="g-4">
                                    <Col xs={6} md={4} lg={3}>
                                        <Card className={styles.addButtonCard} onClick={() => navigate('/inbound')}>
                                            <div className="display-4 fw-lighter">+</div>
                                            <div className="fw-bold">신규 입고 등록</div>
                                        </Card>
                                    </Col>
                                    {filteredItems.map((item) => (
                                        <Col key={item.id} xs={6} md={4} lg={3}>
                                            <Card className={styles.gridCard} onClick={() => navigate(`/inventory/edit/${item.id}`)}>
                                                <div className={styles.imageWrapper}>
                                                    <img src={getImageUrl(item.imageUrl || item.image_url)} alt={item.name} />
                                                    <div className="position-absolute top-0 end-0 m-2">{renderDDayBadge(item)}</div>
                                                </div>
                                                <div className={styles.cardInfo}>
                                                    <div className={styles.cardTitle}>{item.name}</div>
                                                    <div className={styles.cardSub}>{item.stock}개 | {item.location}</div>
                                                    
                                                    {/* 그리드 뷰 이동 버튼 추가 */}
                                                    {(item.customUrl || item.sourceUrl) && (
                                                        <div className="mt-2 border-top pt-2">
                                                            <Button 
                                                                variant="link" 
                                                                className="p-0 text-decoration-none small fw-bold"
                                                                style={{ color: '#ff8a3d' }}
                                                                onClick={(e) => handleUrlClick(e, item.customUrl || item.sourceUrl)}
                                                            >
                                                                {getDisplayServiceName(item)} 🔗
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : (
                                <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
                                    <Table hover responsive className="mb-0 align-middle text-center">
                                        <thead className="bg-light text-muted small">
                                            <tr><th>사진</th><th>품목명</th><th>상태</th><th>분류</th><th>수량</th><th>기한</th><th>링크</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredItems.map(item => (
                                                <tr key={item.id} onClick={() => navigate(`/inventory/edit/${item.id}`)} style={{ cursor: 'pointer' }}>
                                                    <td><img src={getImageUrl(item.imageUrl || item.image_url)} width="45" height="45" className="rounded-3" alt="" /></td>
                                                    <td className="fw-bold">{item.name}</td>
                                                    <td><Badge bg={item.status === '정상' ? 'success' : 'warning'}>{item.status}</Badge></td>
                                                    <td><Badge bg="light" text="dark" className="border">{item.category}</Badge></td>
                                                    <td className="fw-bold" style={{color: '#ff8a3d'}}>{item.stock} EA</td>
                                                    <td>{renderDDayBadge(item)}</td>
                                                    {/* 리스트 뷰 이동 버튼 추가 */}
                                                    <td>
                                                        {(item.customUrl || item.sourceUrl) && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline-warning"
                                                                className="rounded-pill px-3 fw-bold"
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={(e) => handleUrlClick(e, item.customUrl || item.sourceUrl)}
                                                            >
                                                                {getDisplayServiceName(item)} 🔗
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card>
                            )
                        )}
                    </Col>
                    <Col lg={4} xl={3} className="mt-4 mt-lg-0">
                        <div className="sticky-top" style={{ top: '24px' }}>
                            <AiChat />
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Inventory;