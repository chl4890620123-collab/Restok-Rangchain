import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import styles from './Lifecycle.module.css';

const ACTION_LABELS = {
    REGISTERED: '등록',
    USED: '사용 완료',
    SOLD: '판매',
    DONATED: '기부/나눔',
    RECYCLED: '재활용',
    DISPOSED: '폐기',
    REPAIRED: '수리',
    TRANSFERRED: '이관',
    AUTO_EXPIRED: '자동 처리',
    REMOVED: '관리 삭제'
};

const Lifecycle = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [services, setServices] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [form, setForm] = useState({ action: 'USED', quantity: 1, targetUrl: '', note: '' });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [inventoryRes, serviceRes, historyRes] = await Promise.all([
                api.get('/api/inventory'),
                api.get('/api/services'),
                api.get('/api/lifecycle/history')
            ]);
            setInventory(inventoryRes.data || []);
            setServices(serviceRes.data || []);
            setHistory(historyRes.data || []);
        } catch (error) {
            console.error('Lifecycle 데이터 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const activeInventory = useMemo(
        () => inventory.filter(item => Number(item.stock || 0) > 0),
        [inventory]
    );

    const completedCount = useMemo(
        () => history.filter(event => ['USED', 'SOLD', 'DONATED', 'RECYCLED', 'DISPOSED', 'TRANSFERRED', 'AUTO_EXPIRED'].includes(event.action)).length,
        [history]
    );

    const divertedCount = useMemo(
        () => history.filter(event => ['SOLD', 'DONATED', 'RECYCLED', 'REPAIRED', 'TRANSFERRED'].includes(event.action)).length,
        [history]
    );

    const linkedCount = useMemo(
        () => history.filter(event => Boolean(event.targetUrl)).length,
        [history]
    );

    const openActionModal = useCallback((product) => {
        setSelectedProduct(product);
        setSelectedServiceId('');
        setForm({
            action: 'USED',
            quantity: 1,
            targetUrl: product?.customUrl || '',
            note: ''
        });
        setShowModal(true);
    }, []);

    useEffect(() => {
        if (loading || !location.state?.productId || inventory.length === 0) return;
        const target = inventory.find(item => String(item.id) === String(location.state.productId));
        if (target) openActionModal(target);
        navigate('/lifecycle', { replace: true, state: {} });
    }, [loading, inventory, location.state, navigate, openActionModal]);

    const handleServiceChange = (serviceId) => {
        setSelectedServiceId(serviceId);
        const service = services.find(item => String(item.id) === String(serviceId));
        if (service) {
            setForm(prev => ({ ...prev, targetUrl: service.url || '' }));
        }
    };

    const submitAction = async () => {
        if (!selectedProduct) return;

        const quantity = Number(form.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > selectedProduct.stock) {
            return alert('처리 수량을 확인해주세요.');
        }

        const service = services.find(item => String(item.id) === String(selectedServiceId));

        try {
            await api.post(`/api/lifecycle/products/${selectedProduct.id}/actions`, {
                action: form.action,
                quantity,
                serviceName: service?.name || selectedProduct.serviceName || '',
                targetUrl: form.targetUrl || service?.url || selectedProduct.customUrl || '',
                note: form.note
            });
            setShowModal(false);
            await loadData();
        } catch (error) {
            console.error('처리 이력 저장 실패:', error);
            alert(error.response?.data?.message || '처리 이력을 저장하지 못했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}>
                <Spinner animation="border" variant="warning" />
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.headerSection}>
                <div>
                    <h2 className={styles.title}>물품 생애주기</h2>
                    <p className={styles.subtitle}>물건을 삭제하는 대신 사용·판매·기부·재활용·폐기 결과를 남겨 다음 선택에 활용합니다.</p>
                </div>
                <div className={styles.headerActions}>
                    <Button className={styles.secondaryButton} onClick={() => navigate('/services')}>URL 연결 관리</Button>
                    <Button className={styles.primaryButton} onClick={() => navigate('/inbound')}>+ 새 물품 등록</Button>
                </div>
            </div>

            <div className={styles.statGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>ACTIVE ITEMS</div>
                    <div className={styles.statValue}>{activeInventory.length}<span>보유</span></div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>LIFECYCLE EVENTS</div>
                    <div className={styles.statValue}>{history.length}<span>기록</span></div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>REUSE / EXIT</div>
                    <div className={styles.statValue}>{divertedCount}<span>재사용·전환</span></div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>URL CONNECTED</div>
                    <div className={styles.statValue}>{linkedCount}<span>외부 연결</span></div>
                </div>
            </div>

            <Row className="g-4">
                <Col xl={5}>
                    <Card className={styles.contentCard}>
                        <Card.Body className={styles.cardBody}>
                            <h5 className={styles.cardTitle}>현재 보유 물품</h5>
                            <p className={styles.cardDescription}>처리할 물품을 선택하면 판매·기부·재활용·폐기 등의 결과를 기록할 수 있습니다.</p>

                            {activeInventory.length === 0 ? (
                                <div className={styles.emptyState}>처리할 보유 물품이 없습니다.</div>
                            ) : (
                                <div className={styles.productList}>
                                    {activeInventory.map(item => (
                                        <Button
                                            key={item.id}
                                            className={styles.productButton}
                                            onClick={() => openActionModal(item)}
                                        >
                                            <div className="d-flex justify-content-between align-items-center gap-3">
                                                <div>
                                                    <div className={styles.productName}>{item.name}</div>
                                                    <div className={styles.productMeta}>
                                                        {item.category || '미분류'} · {item.location || '위치 미지정'}
                                                        {item.serviceName && item.serviceName !== '일반' ? ` · ${item.serviceName}` : ''}
                                                    </div>
                                                </div>
                                                <Badge className={styles.stockBadge}>{item.stock}개</Badge>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={7}>
                    <Card className={styles.contentCard}>
                        <Card.Body className={styles.cardBody}>
                            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                <div>
                                    <h5 className={styles.cardTitle}>처리 기록</h5>
                                    <p className={styles.cardDescription}>등록부터 사용·판매·기부·재활용·폐기까지 물품의 이력을 보존합니다.</p>
                                </div>
                                <Badge bg="light" text="dark" className="border rounded-pill px-3 py-2">완료 {completedCount}건</Badge>
                            </div>

                            <Table responsive hover className={styles.historyTable}>
                                <thead>
                                    <tr>
                                        <th>물품</th>
                                        <th>행동</th>
                                        <th>수량</th>
                                        <th>연결</th>
                                        <th>일시</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.slice(0, 30).map(event => (
                                        <tr key={event.id}>
                                            <td className="fw-bold">{event.productName}</td>
                                            <td><Badge className={styles.actionBadge}>{ACTION_LABELS[event.action] || event.action}</Badge></td>
                                            <td>{event.quantity}</td>
                                            <td>
                                                {event.targetUrl ? (
                                                    <a href={event.targetUrl} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                                                        {event.serviceName || 'URL'} ↗
                                                    </a>
                                                ) : (
                                                    <span className="text-muted">직접 처리</span>
                                                )}
                                            </td>
                                            <td className="text-muted small">{event.createdAt ? new Date(event.createdAt).toLocaleString() : '-'}</td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className={styles.emptyState}>아직 처리 기록이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton className={styles.modalHeader}>
                    <Modal.Title className={styles.modalTitle}>처리 결과 기록</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    <div className="mb-4 p-3 rounded-4" style={{ background: '#fff7f1' }}>
                        <strong>{selectedProduct?.name}</strong>
                        <span className="text-muted small ms-2">현재 {selectedProduct?.stock || 0}개</span>
                    </div>

                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group className={styles.modalField}>
                                <Form.Label className="fw-bold">어떻게 처리했나요?</Form.Label>
                                <Form.Select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}>
                                    <option value="USED">사용 완료</option>
                                    <option value="SOLD">판매</option>
                                    <option value="DONATED">기부/나눔</option>
                                    <option value="RECYCLED">재활용</option>
                                    <option value="DISPOSED">폐기</option>
                                    <option value="REPAIRED">수리</option>
                                    <option value="TRANSFERRED">이관</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className={styles.modalField}>
                                <Form.Label className="fw-bold">수량</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max={selectedProduct?.stock || 1}
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group className={styles.modalField}>
                                <Form.Label className="fw-bold">연결 서비스</Form.Label>
                                <Form.Select value={selectedServiceId} onChange={e => handleServiceChange(e.target.value)}>
                                    <option value="">직접 처리 / 사용자 URL</option>
                                    {services.map(service => (
                                        <option key={service.id} value={service.id}>[{service.type}] {service.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group className={styles.modalField}>
                                <Form.Label className="fw-bold">URL</Form.Label>
                                <Form.Control
                                    placeholder="https://..."
                                    value={form.targetUrl}
                                    onChange={e => setForm({ ...form, targetUrl: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group className={styles.modalField}>
                                <Form.Label className="fw-bold">메모</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="판매 금액, 폐기 이유, 다음 구매 시 참고할 내용 등"
                                    value={form.note}
                                    onChange={e => setForm({ ...form, note: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer className="border-0 px-4 pb-4">
                    <Button variant="light" className="rounded-4 px-4 fw-bold" onClick={() => setShowModal(false)}>취소</Button>
                    <Button className={styles.primaryButton} onClick={submitAction}>처리 결과 저장</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Lifecycle;
