import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Table, Form, Button, Card, Spinner, Row, Col, Alert } from 'react-bootstrap';
import api from '../api';
import styles from './Inbound.module.css';

const AiBatchInbound = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const {
        scannedItems = [],
        sourceImage,
        defaultCategory,
        defaultLocation,
        defaultServiceId = '',
        defaultCustomUrl = ''
    } = location.state || {};

    const [items, setItems] = useState(scannedItems);
    const [isSaving, setIsSaving] = useState(false);
    const [services, setServices] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState(String(defaultServiceId || ''));
    const [customUrl, setCustomUrl] = useState(defaultCustomUrl || '');

    useEffect(() => {
        api.get('/api/services')
            .then(res => setServices(Array.isArray(res.data) ? res.data : []))
            .catch(err => console.error('URL 연결 목록 로드 실패:', err));
    }, []);

    const selectedService = useMemo(
        () => services.find(service => String(service.id) === String(selectedServiceId)),
        [services, selectedServiceId]
    );

    const handleChange = (index, field, value) => {
        setItems(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item));
    };

    const handleRemove = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleFinalSubmit = async () => {
        if (items.length === 0) return alert('등록할 품목이 없습니다.');

        setIsSaving(true);
        try {
            const effectiveUrl = selectedService?.url || customUrl.trim();
            const finalItems = items.map(item => ({
                name: item.name,
                category: item.category || defaultCategory || '미분류',
                location: item.location || defaultLocation || '',
                stock: Math.max(1, Number(item.stock) || 1),
                expiryDate: item.expiryDate || '',
                referenceDate: new Date().toISOString().split('T')[0],
                timeType: 'EXPIRATION',
                status: '정상',
                description: 'AI 영수증 스캔을 통해 등록됨',
                serviceName: selectedService?.name || (effectiveUrl ? '직접 URL' : ''),
                serviceType: selectedService?.type || (effectiveUrl ? '직접입력' : ''),
                customUrl: effectiveUrl || '',
                qrCodeData: `RS-AI-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                autoDelete: false
            }));

            const sendData = new FormData();
            if (sourceImage) {
                sendData.append('image', sourceImage);
            }
            sendData.append('dataList', JSON.stringify(finalItems));

            await api.post('/api/inventory/with-image-batch', sendData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert(`${finalItems.length}개 품목이 등록되었습니다.`);
            navigate('/inventory');
        } catch (err) {
            console.error('일괄 저장 실패:', err);
            alert(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Container fluid className="py-4 px-4 px-lg-5">
            <div className="mb-4">
                <h2 className="fw-bold mb-1">🧾 영수증 분석 결과 확인</h2>
                <p className="text-muted mb-0">AI 결과를 사람이 확인한 뒤 저장합니다. 처리할 외부 서비스 URL도 함께 연결할 수 있습니다.</p>
            </div>

            <Alert variant="light" className="border rounded-4 mb-4">
                AI는 입력 시간을 줄이는 보조 수단입니다. 품목명·수량·기한이 실제 영수증과 맞는지 확인해주세요.
            </Alert>

            <Card className="shadow-sm border-0 rounded-4 p-4 mb-4">
                <h6 className="fw-bold mb-3">처리 서비스 연결</h6>
                <Row className="g-3">
                    <Col lg={5}>
                        <Form.Select
                            className="rounded-4 py-2"
                            value={selectedServiceId}
                            onChange={e => setSelectedServiceId(e.target.value)}
                        >
                            <option value="">직접 URL 입력 또는 연결 안 함</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>[{service.type}] {service.name}</option>
                            ))}
                        </Form.Select>
                    </Col>
                    <Col lg={7}>
                        <Form.Control
                            className="rounded-4 py-2"
                            placeholder="직접 연결 URL (https://...)"
                            value={selectedService ? selectedService.url : customUrl}
                            disabled={Boolean(selectedService)}
                            onChange={e => setCustomUrl(e.target.value)}
                        />
                    </Col>
                </Row>
            </Card>

            <Card className="shadow-sm border-0 rounded-4 p-4 mb-4">
                <Table responsive hover className="align-middle mb-0">
                    <thead>
                        <tr>
                            <th>품목명</th>
                            <th>카테고리</th>
                            <th style={{ width: '110px' }}>수량</th>
                            <th>유통기한</th>
                            <th style={{ width: '70px' }}>삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={`${item.name}-${idx}`}>
                                <td>
                                    <Form.Control
                                        value={item.name || ''}
                                        onChange={(e) => handleChange(idx, 'name', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        value={item.category || defaultCategory || ''}
                                        onChange={(e) => handleChange(idx, 'category', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        value={item.stock || 1}
                                        onChange={(e) => handleChange(idx, 'stock', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        type="date"
                                        value={item.expiryDate || ''}
                                        onChange={(e) => handleChange(idx, 'expiryDate', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleRemove(idx)}>✕</Button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan="5" className="text-center text-muted py-5">등록할 품목이 없습니다.</td></tr>
                        )}
                    </tbody>
                </Table>
            </Card>

            <div className="d-flex gap-3">
                <Button variant="secondary" className="px-4 py-3 rounded-4 fw-bold" onClick={() => navigate(-1)}>
                    이전으로
                </Button>
                <Button
                    className={`${styles.submitButton} flex-grow-1 py-3 rounded-4 fw-bold`}
                    onClick={handleFinalSubmit}
                    disabled={isSaving || items.length === 0}
                >
                    {isSaving ? <Spinner size="sm" /> : `${items.length}개 품목 일괄 등록`}
                </Button>
            </div>
        </Container>
    );
};

export default AiBatchInbound;
