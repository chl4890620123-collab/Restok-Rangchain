import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom'; 
import { Spinner, Card, Button, Badge, Row, Col, Form, ListGroup, Container } from 'react-bootstrap';
import api from '../api'; 
import styles from './Scanner.module.css';

const Scanner = () => {
    const scannerRef = useRef(null);
    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_API_URL || "";
    
    const [inventory, setInventory] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [quickItem, setQuickItem] = useState(null); 

    const [locations, setLocations] = useState(["전체"]);
    const [categories, setCategories] = useState(["전체"]);
    const [selectedLocation, setSelectedLocation] = useState("전체");
    const [selectedCategory, setSelectedCategory] = useState("전체");

    const loadInitialData = useCallback(async () => {
        try {
            const invRes = await api.get(`/api/inventory?t=${Date.now()}`);
            setInventory(invRes.data);

            const settingsRes = await api.get('/api/user-settings');
            const cats = settingsRes.data.categories || [];
            const locs = settingsRes.data.locations || [];
            
            setCategories(["전체", ...cats]);
            setLocations(["전체", ...locs]);
        } catch (e) { 
            console.error("데이터 로드 실패:", e);
            if (e.response?.status === 401) {
                navigate('/login');
            }
        }
    }, [navigate]);

    const filteredItems = useMemo(() => {
        return inventory.filter(item => {
            const locMatch = selectedLocation === "전체" || item.location === selectedLocation;
            const catMatch = selectedCategory === "전체" || item.category === selectedCategory;
            return locMatch && catMatch;
        });
    }, [inventory, selectedLocation, selectedCategory]);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                // clear()는 비동기로 동작하므로 await를 사용하는 것이 안전합니다.
                await scannerRef.current.clear();
                scannerRef.current = null;
            } catch (err) {
                console.error("스캐너 정지 중 에러:", err);
            }
        }
    }, []);

    const onScanSuccess = useCallback(async (scannedText) => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        try {
            const response = await api.get(`/api/inventory/search`, {
                params: { qrCode: scannedText.trim() }
            });

            if (response.status === 200 && response.data) {
                setQuickItem(response.data);
                if (selectedLocation === "전체") setSelectedLocation(response.data.location);
            }
        } catch (error) {
            if (error.response?.status === 404 || !error.response) {
                if (window.confirm(`등록되지 않은 QR(${scannedText})입니다. 신규 등록하시겠습니까?`)) {
                    navigate('/inbound', { state: { scannedQr: scannedText } });
                }
            } else {
                alert("상품 조회 중 오류가 발생했습니다.");
            }
        } finally { 
            setIsProcessing(false); 
        }
    }, [isProcessing, selectedLocation, navigate]);

    const initScanner = useCallback(() => {
        // 이미 스캐너가 존재하거나 DOM에 reader 엘리먼트가 없으면 중단
        const readerElement = document.getElementById("reader");
        if (scannerRef.current || !readerElement) return;

        const scanner = new Html5QrcodeScanner("reader", { 
            fps: 10, 
            qrbox: (vw, vh) => {
                let size = Math.floor(Math.min(vw, vh) * 0.7);
                return { width: Math.max(size, 250), height: Math.max(size, 250) };
            },
            aspectRatio: 1.0, 
            rememberLastUsedCamera: true
        }, false);

        scanner.render(onScanSuccess, () => {});
        scannerRef.current = scanner;
    }, [onScanSuccess]);

    // 초기 데이터 로드와 스캐너 초기화 분리
    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        // 약간의 지연을 주어 DOM 렌더링이 확실히 끝난 후 스캐너를 붙입니다.
        const timer = setTimeout(() => {
            initScanner();
        }, 100);

        return () => {
            clearTimeout(timer);
            stopScanner();
        };
    }, [initScanner, stopScanner]);

    const handleQuickUpdate = async (updatedFields) => {
        if (!quickItem) return;
        const newData = { ...quickItem, ...updatedFields };
        setQuickItem(newData); 
        
        try {
            const sendData = new FormData();
            const cleanData = {
                ...newData,
                serviceType: newData.serviceType || "일반",
                category: newData.category || "기타",
                stock: Number(newData.stock),
                weight: newData.weight ? Number(newData.weight) : 0
            };

            sendData.append(
                "product",
                new Blob([JSON.stringify(cleanData)], { type: "application/json" })
            );

            await api.put(`/api/inventory/${quickItem.id}`, sendData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const invRes = await api.get(`/api/inventory?t=${Date.now()}`);
            setInventory(invRes.data);
        } catch (error) { 
            alert("수정 실패: " + (error.response?.data?.message || "서버 에러"));
            loadInitialData();
        }
    };

    return (
        <div className={styles.pageContent}>
            <Container>
                <div className={styles.titleSection}>
                    <h2 className={styles.titleText}>ICQA Inventory Control</h2>
                    <p className="text-muted small">구역을 선택하거나 QR을 스캔하여 재고를 보정하세요.</p>
                </div>

                <Card className={styles.filterCard}>
                    <Card.Body className="p-3">
                        <Row className="g-2">
                            <Col xs={6}>
                                <Form.Select size="sm" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                                </Form.Select>
                            </Col>
                            <Col xs={6}>
                                <Form.Select size="sm" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
                
                <div className={styles.scannerContainer}>
                    <div id="reader" className={styles.readerBox}></div>
                    {isProcessing && (
                        <div className={styles.processingOverlay}>
                            <Spinner animation="grow" variant="warning" />
                        </div>
                    )}
                </div>

                {quickItem && (
                    <Card className={styles.quickUpdateCard}>
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <img 
                                    src={quickItem.imageUrl?.startsWith('http') ? quickItem.imageUrl : `${API_BASE_URL}${quickItem.imageUrl}`} 
                                    className={styles.itemImage} 
                                    alt="" 
                                    onError={(e) => e.target.src = "/default.png"}
                                />
                                <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-0">{quickItem.name}</h6>
                                    <div className="text-muted small mb-1">{quickItem.location}</div>
                                    <Badge bg="warning" text="dark" className="small">현재 점검 중</Badge>
                                </div>
                                <Button variant="link" className="text-decoration-none text-muted p-0" onClick={() => navigate(`/inventory/edit/${quickItem.id}`)}>상세 {'>'}</Button>
                            </div>

                            <div className={styles.stockControlBox}>
                                <Button variant="white" className="shadow-sm rounded-circle fw-bold" onClick={() => handleQuickUpdate({stock: Math.max(0, quickItem.stock - 1)})}>-</Button>
                                <span className={styles.stockNumber}>{quickItem.stock}</span>
                                <Button variant="warning" className="rounded-circle fw-bold text-white shadow-sm" onClick={() => handleQuickUpdate({stock: quickItem.stock + 1})}>+</Button>
                            </div>

                            <div className="d-flex gap-2">
                                {['정상', '파손', '폐기'].map(s => (
                                    <Button key={s} variant={quickItem.status === s ? 'dark' : 'outline-secondary'} className="flex-grow-1 rounded-pill fw-bold py-2" onClick={() => handleQuickUpdate({status: s})}>{s}</Button>
                                ))}
                            </div>
                            <Button className={`w-100 mt-4 py-2 text-white ${styles.actionButton}`} onClick={() => setQuickItem(null)}>✅ 보정 완료</Button>
                        </Card.Body>
                    </Card>
                )}

                <div className={styles.listWrapper}>
                    <h6 className={styles.listTitle}>{selectedLocation} 점검 리스트</h6>
                    <ListGroup className={styles.inventoryList}>
                        {filteredItems.map(item => (
                            <ListGroup.Item 
                                key={item.id} 
                                onClick={() => setQuickItem(item)} 
                                className={`${styles.inventoryItem} d-flex justify-content-between align-items-center ${quickItem?.id === item.id ? styles.activeItem : ''}`}
                            >
                                <div className="d-flex align-items-center gap-3">
                                    <span style={{fontSize: '1.2rem'}}>{quickItem?.id === item.id ? '📍' : '📦'}</span>
                                    <div>
                                        <div className={`fw-bold ${quickItem?.id === item.id ? styles.textOrange : ''}`}>{item.name}</div>
                                        <div className="text-muted small">{item.location} | {item.stock}개</div>
                                    </div>
                                </div>
                                <Badge bg={item.status === '정상' ? 'success' : 'danger'} pill>{item.status}</Badge>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </div>
            </Container>
        </div>
    );
};

export default Scanner;