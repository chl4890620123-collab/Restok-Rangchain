import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Form, Row, Col, Badge, Alert } from 'react-bootstrap';
import api from '../api';
import styles from './ServiceConfig.module.css';

const CONNECTOR_TYPES = ['판매', '기부/나눔', '재활용', '폐기', '수리', '보관', '구매', '기타'];

const ServiceConfig = () => {
    const [services, setServices] = useState([]);
    const [newSite, setNewSite] = useState({ name: '', url: '', type: '판매' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const fetchServices = useCallback(async () => {
        try {
            const response = await api.get('/api/services');
            setServices(response.data || []);
        } catch (err) {
            console.error('연결 서비스 로드 실패:', err);
            setError('URL 연결 목록을 불러오지 못했습니다.');
        }
    }, []);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    const handleAdd = async () => {
        setMessage('');
        setError('');

        const trimmedName = newSite.name.trim();
        const trimmedUrl = newSite.url.trim();
        if (!trimmedName || !trimmedUrl) {
            setError('서비스 이름과 URL을 모두 입력해주세요.');
            return;
        }

        try {
            await api.post('/api/services', {
                ...newSite,
                name: trimmedName,
                url: trimmedUrl
            });
            setNewSite({ name: '', url: '', type: '판매' });
            setMessage('URL 연결을 등록했습니다.');
            await fetchServices();
        } catch (err) {
            console.error('연결 등록 실패:', err);
            setError(err.response?.data?.message || 'URL 연결을 등록하지 못했습니다.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('이 URL 연결을 삭제하시겠습니까?')) return;
        setMessage('');
        setError('');

        try {
            await api.delete(`/api/services/${id}`);
            setMessage('URL 연결을 삭제했습니다.');
            await fetchServices();
        } catch (err) {
            console.error('연결 삭제 실패:', err);
            setError('삭제에 실패했습니다.');
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.headerSection}>
                <h3 className={styles.title}>🔗 URL 연결 관리</h3>
                <p className="text-muted small mb-0">특정 업체 API에 종속되지 않고, 내가 사용하는 판매·기부·재활용·폐기 사이트를 직접 연결합니다.</p>
            </div>

            <Alert variant="light" className="border rounded-4 small mb-3">
                <strong>URL-first 원칙</strong> · URL은 기본 연결 단위이고, API는 반복 작업을 자동화할 가치가 확인된 서비스에 선택적으로 추가합니다.
            </Alert>
            {message && <Alert variant="success" className="rounded-4 py-2">{message}</Alert>}
            {error && <Alert variant="danger" className="rounded-4 py-2">{error}</Alert>}

            <Card className={styles.formCard}>
                <h6 className={styles.formTitle}>새 연결 등록</h6>
                <Row className="g-2">
                    <Col md={2}>
                        <Form.Select
                            className={styles.inputField}
                            value={newSite.type}
                            onChange={e => setNewSite({ ...newSite, type: e.target.value })}
                        >
                            {CONNECTOR_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </Form.Select>
                    </Col>
                    <Col md={3}>
                        <Form.Control
                            placeholder="서비스/기관 이름"
                            className={styles.inputField}
                            value={newSite.name}
                            onChange={e => setNewSite({ ...newSite, name: e.target.value })}
                        />
                    </Col>
                    <Col md={5}>
                        <Form.Control
                            placeholder="URL (example.com 또는 https://...)"
                            className={styles.inputField}
                            value={newSite.url}
                            onChange={e => setNewSite({ ...newSite, url: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </Col>
                    <Col md={2}>
                        <Button className={styles.addButton} onClick={handleAdd}>연결 추가</Button>
                    </Col>
                </Row>
            </Card>

            <Card className={styles.tableCard}>
                <Table hover responsive className="m-0 align-middle">
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th className="ps-4">목적</th>
                            <th>서비스</th>
                            <th>URL</th>
                            <th className="text-center">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(service => (
                            <tr key={service.id} className={styles.tableRow}>
                                <td className="ps-4"><Badge pill bg="primary" className={styles.typeBadge}>{service.type}</Badge></td>
                                <td className={styles.siteName}>{service.name}</td>
                                <td>
                                    <a href={service.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                                        {service.url}
                                    </a>
                                </td>
                                <td className="text-center">
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(service.id)}>삭제</Button>
                                </td>
                            </tr>
                        ))}
                        {services.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center text-muted py-4">아직 등록한 연결이 없습니다. 내가 자주 쓰는 서비스부터 추가해보세요.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card>
        </div>
    );
};

export default ServiceConfig;
