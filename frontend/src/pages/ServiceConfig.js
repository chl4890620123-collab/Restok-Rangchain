import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Button, Form, Row, Col, Badge } from 'react-bootstrap';
import api from '../api'; // ✅ 공통 API 객체 사용
import styles from './ServiceConfig.module.css';

const ServiceConfig = () => {
    const [services, setServices] = useState([]);
    const [newSite, setNewSite] = useState({ name: '', url: '', type: '나눔' });

    // 서비스 목록 조회 (GET)
    const fetchServices = useCallback(async () => {
        try {
            // ✅ api.js에 설정된 baseURL 덕분에 엔드포인트만 작성하면 됩니다.
            const response = await api.get('/api/services');
            setServices(response.data);
        } catch (error) {
            console.error("데이터 로드 실패:", error);
            // 401 처리는 api.js의 interceptor에서 공통으로 처리하는 것이 좋지만, 
            // 개별 컴포넌트에서도 필요한 경우 유지합니다.
            if (error.response?.status === 401) {
                alert("로그인 세션이 만료되었습니다.");
            }
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    // 새 사이트 등록 (POST)
    const handleAdd = async () => {
        const trimmedName = newSite.name.trim();
        const trimmedUrl = newSite.url.trim();

        if (!trimmedName || !trimmedUrl) {
            return alert("이름과 URL을 모두 입력해주세요!");
        }
        
        const formattedUrl = trimmedUrl.match(/^https?:\/\//) ? trimmedUrl : `https://${trimmedUrl}`;
        const dataToSend = { ...newSite, name: trimmedName, url: formattedUrl };

        try {
            // ✅ 공통 api 객체 사용으로 코드가 훨씬 깔끔해졌습니다.
            await api.post('/api/services', dataToSend);
            alert("등록되었습니다.");
            setNewSite({ name: '', url: '', type: '나눔' }); 
            fetchServices(); 
        } catch (error) {
            console.error("등록 실패:", error);
            alert("등록 중 오류가 발생했습니다. 권한을 확인하세요.");
        }
    };

    // 사이트 삭제 (DELETE)
    const handleDelete = async (id) => {
        if (!window.confirm("정말 삭제하시겠습니까?")) return;
        try {
            // ✅ 템플릿 리터럴을 활용한 삭제 요청
            await api.delete(`/api/services/${id}`);
            fetchServices(); 
        } catch (error) {
            console.error("삭제 실패:", error);
            alert("삭제에 실패했습니다.");
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.headerSection}>
                <h3 className={styles.title}>🔗 처리 사이트 관리</h3>
                <p className="text-muted small">입고/출고 시 선택할 외부 사이트 목록을 관리합니다.</p>
            </div>
            
            <Card className={styles.formCard}>
                <h6 className={styles.formTitle}>새 사이트 등록</h6>
                <Row className="g-2">
                    <Col md={2}>
                        <Form.Select
                            className={styles.inputField}
                            value={newSite.type}
                            onChange={e => setNewSite({...newSite, type: e.target.value})}
                        >
                            <option value="구매">구매</option>
                            <option value="판매">판매</option>
                            <option value="폐기">폐기</option>
                            <option value="나눔">나눔</option>
                        </Form.Select>
                    </Col>
                    <Col md={3}>
                        <Form.Control
                            placeholder="기관/업체명"
                            className={styles.inputField}
                            value={newSite.name}
                            onChange={e => setNewSite({...newSite, name: e.target.value})}
                        />
                    </Col>
                    <Col md={5}>
                        <Form.Control
                            placeholder="URL (example.com)"
                            className={styles.inputField}
                            value={newSite.url}
                            onChange={e => setNewSite({...newSite, url: e.target.value})}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                    </Col>
                    <Col md={2}>
                        <Button className={styles.addButton} onClick={handleAdd}>추가하기</Button>
                    </Col>
                </Row>
            </Card>

            <Card className={styles.tableCard}>
                <Table hover responsive className="m-0 align-middle">
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th className="ps-4">타입</th>
                            <th>사이트명</th>
                            <th>연결 URL</th>
                            <th className="text-center">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(s => (
                            <tr key={s.id} className={styles.tableRow}>
                                <td className="ps-4">
                                    <Badge pill bg="primary" className={styles.typeBadge}>{s.type}</Badge>
                                </td>
                                <td className={styles.siteName}>{s.name}</td>
                                <td>
                                    <a href={s.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                                        {s.url}
                                    </a>
                                </td>
                                <td className="text-center">
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleDelete(s.id)}
                                    >
                                        삭제
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>
        </div>
    );
};

export default ServiceConfig;