import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Container, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import api from '../api';

const ACTION_LABELS = { USED: '사용 완료', SOLD: '판매', DONATED: '기부/나눔', RECYCLED: '재활용', DISPOSED: '폐기', REPAIRED: '수리', TRANSFERRED: '이관', AUTO_EXPIRED: '자동 처리' };

const Lifecycle = () => {
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
            const [inventoryRes, serviceRes, historyRes] = await Promise.all([api.get('/api/inventory'), api.get('/api/services'), api.get('/api/lifecycle/history')]);
            setInventory(inventoryRes.data || []);
            setServices(serviceRes.data || []);
            setHistory(historyRes.data || []);
        } catch (error) { console.error('Lifecycle 데이터 로드 실패:', error); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    const activeInventory = useMemo(() => inventory.filter(item => Number(item.stock || 0) > 0), [inventory]);

    const openActionModal = (product) => {
        setSelectedProduct(product); setSelectedServiceId('');
        setForm({ action: 'USED', quantity: 1, targetUrl: product.customUrl || '', note: '' });
        setShowModal(true);
    };

    const handleServiceChange = (serviceId) => {
        setSelectedServiceId(serviceId);
        const service = services.find(item => String(item.id) === String(serviceId));
        if (service) setForm(prev => ({ ...prev, targetUrl: service.url || '' }));
    };

    const submitAction = async () => {
        if (!selectedProduct) return;
        const quantity = Number(form.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > selectedProduct.stock) return alert('처리 수량을 확인해주세요.');
        const service = services.find(item => String(item.id) === String(selectedServiceId));
        try {
            await api.post(`/api/lifecycle/products/${selectedProduct.id}/actions`, { action: form.action, quantity, serviceName: service?.name || selectedProduct.serviceName || '', targetUrl: form.targetUrl || service?.url || selectedProduct.customUrl || '', note: form.note });
            setShowModal(false); await loadData();
        } catch (error) { console.error('처리 이력 저장 실패:', error); alert(error.response?.data?.message || '처리 이력을 저장하지 못했습니다.'); }
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '70vh' }}><Spinner animation="border" variant="warning" /></div>;

    return (
        <Container fluid className="p-4">
            <div className="mb-4"><h2 className="fw-bold mb-1">물품 생애주기</h2><p className="text-muted mb-0">물건을 지우는 대신 사용·판매·기부·재활용·폐기 결과를 기록하고 다음 선택에 활용합니다.</p></div>
            <Row className="g-4 mb-4">
                <Col lg={5}><Card className="border-0 shadow-sm rounded-4 h-100"><Card.Body className="p-4"><h5 className="fw-bold mb-3">현재 보유 물품</h5>{activeInventory.length === 0 ? <div className="text-muted py-4 text-center">처리할 보유 물품이 없습니다.</div> : <div className="d-grid gap-2">{activeInventory.slice(0, 12).map(item => <Button key={item.id} variant="light" className="text-start border rounded-3 p-3 d-flex justify-content-between align-items-center" onClick={() => openActionModal(item)}><span><strong>{item.name}</strong><span className="text-muted small ms-2">{item.category || '미분류'}</span></span><Badge bg="dark">{item.stock}개</Badge></Button>)}</div>}</Card.Body></Card></Col>
                <Col lg={7}><Card className="border-0 shadow-sm rounded-4 h-100"><Card.Body className="p-4"><h5 className="fw-bold mb-3">최근 처리 기록</h5><Table responsive hover className="align-middle mb-0"><thead><tr><th>물품</th><th>행동</th><th>수량</th><th>연결</th><th>일시</th></tr></thead><tbody>{history.slice(0, 20).map(event => <tr key={event.id}><td className="fw-semibold">{event.productName}</td><td><Badge bg="secondary">{ACTION_LABELS[event.action] || event.action}</Badge></td><td>{event.quantity}</td><td>{event.targetUrl ? <a href={event.targetUrl} target="_blank" rel="noopener noreferrer">{event.serviceName || 'URL'} ↗</a> : <span className="text-muted">직접 처리</span>}</td><td className="text-muted small">{event.createdAt ? new Date(event.createdAt).toLocaleString() : '-'}</td></tr>)}{history.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">아직 처리 기록이 없습니다.</td></tr>}</tbody></Table></Card.Body></Card></Col>
            </Row>
            <Modal show={showModal} onHide={() => setShowModal(false)} centered><Modal.Header closeButton><Modal.Title>처리 결과 기록</Modal.Title></Modal.Header><Modal.Body><div className="mb-3"><strong>{selectedProduct?.name}</strong><span className="text-muted small ms-2">현재 {selectedProduct?.stock || 0}개</span></div><Form.Group className="mb-3"><Form.Label>어떻게 처리했나요?</Form.Label><Form.Select value={form.action} onChange={e => setForm({...form, action: e.target.value})}><option value="USED">사용 완료</option><option value="SOLD">판매</option><option value="DONATED">기부/나눔</option><option value="RECYCLED">재활용</option><option value="DISPOSED">폐기</option><option value="REPAIRED">수리</option><option value="TRANSFERRED">이관</option></Form.Select></Form.Group><Form.Group className="mb-3"><Form.Label>수량</Form.Label><Form.Control type="number" min="1" max={selectedProduct?.stock || 1} value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></Form.Group><Form.Group className="mb-3"><Form.Label>연결 서비스</Form.Label><Form.Select value={selectedServiceId} onChange={e => handleServiceChange(e.target.value)}><option value="">직접 처리 / 사용자 URL</option>{services.map(service => <option key={service.id} value={service.id}>[{service.type}] {service.name}</option>)}</Form.Select></Form.Group><Form.Group className="mb-3"><Form.Label>URL</Form.Label><Form.Control placeholder="https://..." value={form.targetUrl} onChange={e => setForm({...form, targetUrl: e.target.value})} /></Form.Group><Form.Group><Form.Label>메모</Form.Label><Form.Control as="textarea" rows={3} placeholder="판매 금액, 폐기 이유, 다음 구매 시 참고할 내용 등" value={form.note} onChange={e => setForm({...form, note: e.target.value})} /></Form.Group></Modal.Body><Modal.Footer><Button variant="light" onClick={() => setShowModal(false)}>취소</Button><Button variant="warning" className="fw-bold" onClick={submitAction}>기록하기</Button></Modal.Footer></Modal>
        </Container>
    );
};

export default Lifecycle;
