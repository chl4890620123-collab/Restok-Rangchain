import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Table, Form, Button, Card, Spinner } from 'react-bootstrap';
import api from '../api'; // 스프링 부트(8080) 설정이 담긴 axios 인스턴스
import styles from './Inbound.module.css'; // 기존 스타일 재활용

const AiBatchInbound = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Inbound.js에서 넘겨준 데이터 추출
    const { scannedItems, sourceImage, defaultCategory, defaultLocation } = location.state || { scannedItems: [] };
    
    const [items, setItems] = useState(scannedItems);
    const [issaving, setIsSaving] = useState(false);

    // 필드 수정 핸들러
    const handleChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    // 항목 삭제
    const handleRemove = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // 최종 저장 (스프링 부트로 전송)
    const handleFinalSubmit = async () => {
        if (items.length === 0) return alert("입고할 품목이 없습니다.");
        
        setIsSaving(true);
        try {
            // 여러 개의 아이템을 저장하기 위해 반복문 또는 벌크 API 사용
            // 여기서는 서버의 /api/inventory/with-image API를 각 아이템별로 호출하는 예시입니다.
            // (서버에 벌크 입고 API가 있다면 그것을 사용하는 것이 더 좋습니다.)
            for (const item of items) {
                const sendData = new FormData();
                
                // 이미지 파일 (동일한 영수증 이미지 사용 또는 생략 가능)
                if (sourceImage) {
                    sendData.append("image", sourceImage);
                }

                const finalData = {
                    name: item.name,
                    category: item.category || defaultCategory,
                    location: defaultLocation,
                    stock: item.stock || 1,
                    expiryDate: item.expiryDate,
                    timeType: 'EXPIRATION',
                    status: '정상',
                    description: 'AI 영수증 스캔을 통해 등록됨',
                    qrCodeData: `RS-AI-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                };

                sendData.append("data", new Blob([JSON.stringify(finalData)], { type: "application/json" }));
                
                await api.post('/api/inventory/with-image', sendData);
            }

            alert("모든 품목이 등록되었습니다!");
            navigate('/inventory');
        } catch (err) {
            console.error("저장 실패:", err);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Container className="py-5">
            <h2 className="mb-4 fw-bold">🧾 영수증 분석 결과 확인</h2>
            <p className="text-muted">AI가 분석한 내용입니다. 정확하지 않은 정보는 수정 후 등록해주세요.</p>

            <Card className="shadow-sm border-0 rounded-4 p-4 mb-4">
                <Table responsive hover>
                    <thead>
                        <tr>
                            <th>품목명</th>
                            <th>카테고리</th>
                            <th>수량</th>
                            <th>유통기한</th>
                            <th>삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td>
                                    <Form.Control 
                                        value={item.name} 
                                        onChange={(e) => handleChange(idx, 'name', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control 
                                        value={item.category} 
                                        onChange={(e) => handleChange(idx, 'category', e.target.value)}
                                    />
                                </td>
                                <td style={{ width: '100px' }}>
                                    <Form.Control 
                                        type="number"
                                        value={item.stock} 
                                        onChange={(e) => handleChange(idx, 'stock', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Form.Control 
                                        type="date"
                                        value={item.expiryDate} 
                                        onChange={(e) => handleChange(idx, 'expiryDate', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleRemove(idx)}>✕</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>

            <div className="d-flex gap-3">
                <Button variant="secondary" className="px-5 py-3 rounded-4 fw-bold" onClick={() => navigate(-1)}>
                    이전으로
                </Button>
                <Button variant="primary" className="flex-grow-1 py-3 rounded-4 fw-bold shadow" onClick={handleFinalSubmit} disabled={issaving}>
                    {issaving ? <Spinner size="sm" /> : `${items.length}개 품목 일괄 등록하기`}
                </Button>
            </div>
        </Container>
    );
};

export default AiBatchInbound;