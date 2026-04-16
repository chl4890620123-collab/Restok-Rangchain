import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Row, Col, Form, Button, Spinner, Container, ProgressBar } from 'react-bootstrap';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api'; 
import styles from './InventoryEdit.module.css'; 

const API_BASE_URL = process.env.REACT_APP_API_URL || "";

const InventoryEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false); 
    const [imgData, setImgData] = useState(null); 
    const [imageBlob, setImageBlob] = useState(null); 

    const [locations, setLocations] = useState([]);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        stock: 0,
        location: '', 
        url: '',
        customUrl: '',
        serviceName: '', 
        serviceType: '', 
        timeType: 'EXPIRATION',
        referenceDate: '',
        expiryDate: '',
        description: '', // 데이터 구조에는 존재함
        status: '정상',
        qrCodeData: '',
        autoDelete: false
    });

    const [serviceList, setServiceList] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState("");
    const [daysToAdd, setDaysToAdd] = useState(""); 
    const [livePct, setLivePct] = useState(0);
    const [elapsedText, setElapsedText] = useState("");

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const qrPreviewRef = useRef(null);

    const updateLiveProgress = useCallback(() => {
        if (!formData.referenceDate || !formData.expiryDate) {
            setLivePct(0);
            setElapsedText("0일차");
            return;
        }
        const startDate = new Date(formData.referenceDate);
        const endDate = new Date(formData.expiryDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        const now = new Date();
        const totalMs = endDate.getTime() - startDate.getTime();
        const elapsedMs = now.getTime() - startDate.getTime(); 

        if (totalMs <= 0) {
            setLivePct(0);
            setElapsedText("진행 전");
            return;
        }

        let pct = (elapsedMs / totalMs) * 100;
        const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
        
        setLivePct(Math.min(Math.max(Math.floor(pct), 0), 100)); 
        setElapsedText(`${elapsedDays}일차 진행 중`);
    }, [formData.referenceDate, formData.expiryDate]);

    useEffect(() => {
        updateLiveProgress();
        const timer = setInterval(updateLiveProgress, 60000);
        return () => clearInterval(timer);
    }, [updateLiveProgress]);

    const fetchAllData = useCallback(async () => {
        try {
            const [itemRes, serviceRes, settingsRes] = await Promise.all([
                api.get(`/api/inventory/${id}?t=${Date.now()}`),
                api.get(`/api/services`),
                api.get('/api/user-settings')
            ]);
            
            const item = itemRes.data;
            setServiceList(serviceRes.data);
            setFormData({ ...item });

            setCategories(settingsRes.data.categories || []);
            setLocations(settingsRes.data.locations || []);

            if (item.imageUrl) {
                setImgData(item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`);
            }
            
            const matched = serviceRes.data.find(s => s.url === item.customUrl);
            if (matched) {
                setSelectedServiceId(matched.id);
            } else if (item.customUrl || item.serviceName) {
                setSelectedServiceId("custom");
            }
            
            if(item.referenceDate && item.expiryDate) {
                const start = new Date(item.referenceDate).setHours(0,0,0,0);
                const end = new Date(item.expiryDate).setHours(0,0,0,0);
                const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
                setDaysToAdd(diff > 0 ? diff : "");
            }
            setIsLoading(false);
        } catch (e) { 
            console.error("로드 실패:", e);
            navigate('/inventory'); 
        }
    }, [id, navigate]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const handleServiceChange = (e) => {
        const val = e.target.value;
        setSelectedServiceId(val);
        if (val === "custom") {
            setFormData(prev => ({ ...prev, serviceType: "직접입력" }));
        } else if (val === "") {
            setFormData(prev => ({ ...prev, serviceName: "", customUrl: "", serviceType: "" }));
        } else {
            const selected = serviceList.find(s => String(s.id) === String(val));
            if (selected) {
                setFormData(prev => ({ 
                    ...prev, customUrl: selected.url, serviceName: selected.name, serviceType: selected.type 
                }));
            }
        }
    };

    const handleCustomInput = (field, value) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (selectedServiceId !== "custom" && selectedServiceId !== "") {
                setSelectedServiceId("custom");
                next.serviceType = "직접입력";
            }
            return next;
        });
    };

    const startCamera = async () => {
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) { setIsCameraOpen(false); }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
    };

    const takePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            canvas.toBlob((blob) => {
                setImageBlob(blob);
                setImgData(canvas.toDataURL('image/jpeg'));
                stopCamera();
            }, 'image/jpeg');
        }
    };

    const handleDaysChange = (e) => {
        const val = e.target.value;
        setDaysToAdd(val);
        if (val && formData.referenceDate) {
            const date = new Date(formData.referenceDate);
            date.setDate(date.getDate() + parseInt(val));
            setFormData(prev => ({ ...prev, expiryDate: date.toISOString().split('T')[0] }));
        }
    };

    const handleReferenceDateChange = (e) => {
        const val = e.target.value;
        setFormData(prev => {
            const next = { ...prev, referenceDate: val };
            if (daysToAdd && formData.timeType === 'AGING') {
                const date = new Date(val);
                date.setDate(date.getDate() + parseInt(daysToAdd));
                next.expiryDate = date.toISOString().split('T')[0];
            }
            return next;
        });
    };

    const handleExpiryDateChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, expiryDate: val }));
        
        if (formData.referenceDate && formData.timeType === 'AGING') {
            const start = new Date(formData.referenceDate).setHours(0,0,0,0);
            const end = new Date(val).setHours(0,0,0,0);
            const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
            setDaysToAdd(diff > 0 ? diff : 0);
        }
    };

    useEffect(() => {
        if (!isLoading && formData.qrCodeData && window.QRCode && qrPreviewRef.current) {
            qrPreviewRef.current.innerHTML = "";
            new window.QRCode(qrPreviewRef.current, {
                text: formData.qrCodeData,
                width: 140, height: 140,
                colorDark : "#444444", colorLight : "#e0e5ec",
                correctLevel : window.QRCode.CorrectLevel.H
            });
        }
    }, [isLoading, formData.qrCodeData]);

    const handleUpdate = async () => {
        setIsUploading(true);
        const sendData = new FormData();
        if (imageBlob) sendData.append("file", imageBlob, "update.jpg");
        const productData = { ...formData };
        sendData.append("product", new Blob([JSON.stringify(productData)], { type: "application/json" }));
        
        try {
            await api.put(`/api/inventory/${id}`, sendData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            alert("수정되었습니다."); 
            navigate('/inventory');
        } catch (e) { alert("저장 실패"); }
        finally { setIsUploading(false); }
    };

    const handleDelete = async () => {
        if (!window.confirm("정말 이 품목을 삭제하시겠습니까?")) return;
        try {
            await api.delete(`/api/inventory/${id}`);
            alert("삭제되었습니다."); 
            navigate('/inventory');
        } catch (e) { alert("삭제 실패"); }
    };

    if (isLoading) return <div className="text-center mt-5"><Spinner animation="border" variant="warning" /></div>;

    return (
        <div className={styles.inventoryContainer}>
            <Container>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <Link to="/inventory" className={styles.backLink}>← BACK TO LIST</Link>
                    <Button className={styles.nmBtnDelete} onClick={handleDelete}>DELETE ITEM</Button>
                </div>
                
                <div className={`${styles.nmCard} mb-4`} style={{padding: '1.5rem 3rem'}}>
                    <div className="d-flex justify-content-between mb-2 align-items-end">
                        <span className={styles.label}>
                            {formData.timeType === 'AGING' ? '🧪 AGING' : '⏳ FRESHNESS'} 
                            <span className="ms-2" style={{fontSize: '0.85rem', color: livePct >= 100 ? '#ff4d4d' : '#ff8a3d'}}>
                                {formData.timeType === 'AGING' ? `(${daysToAdd || 0}일 목표 / ${elapsedText})` : `만료일 관리`}
                            </span>
                        </span>
                        <span style={{color: livePct >= 100 ? '#ff4d4d' : '#ff8a3d', fontWeight: 'bold'}}>{livePct}%</span>
                    </div>
                    <ProgressBar 
                        now={livePct} 
                        variant={livePct >= 100 ? "danger" : "warning"} 
                        style={{height: '15px', borderRadius: '10px', backgroundColor: '#e0e5ec', boxShadow: 'inset 3px 3px 6px #d1d9e6'}} 
                    />
                </div>

                <div className={styles.nmCard}>
                    <Row className="g-5">
                        <Col lg={5}>
                            <div className={styles.nmCardInset} style={{marginBottom: '2rem'}}>
                                <div className={styles.label}>PRODUCT VISUAL</div>
                                <div className="position-relative overflow-hidden" style={{borderRadius: '25px'}}>
                                    {isCameraOpen ? (
                                        <div className="position-relative">
                                            <video ref={videoRef} autoPlay playsInline className={styles.productImg3D} style={{objectFit: 'cover'}} />
                                            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3">
                                                <Button className={styles.nmBtnMain} onClick={takePhoto}>SHOT</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <img src={imgData || "/default.png"} className={styles.productImg3D} alt="Product" />
                                    )}
                                </div>
                                <div className="d-flex gap-3 mt-4 justify-content-center">
                                    <Button className={styles.nmBtnRound} onClick={isCameraOpen ? stopCamera : startCamera}>{isCameraOpen ? "⏹" : "📷"}</Button>
                                    <Button className={styles.nmBtnRound} onClick={() => fileInputRef.current.click()}>📁</Button>
                                    <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={(e) => {
                                        const file = e.target.files[0];
                                        if(file) {
                                            setImageBlob(file);
                                            const reader = new FileReader();
                                            reader.onload = (ev) => setImgData(ev.target.result);
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                </div>
                            </div>
                            <div className={styles.nmCardInset} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem'}}>
                                <div className={styles.label}>QR CODE PREVIEW</div>
                                <div style={{padding: '20px', background: '#e0e5ec', borderRadius: '25px', boxShadow: '6px 6px 12px #d1d9e6, -6px -6px 12px #ffffff'}}>
                                    <div ref={qrPreviewRef}></div>
                                </div>
                                <div className="mt-3 text-muted small fw-bold">{formData.qrCodeData}</div>
                            </div>
                        </Col>

                        <Col lg={7}>
                            <div className={styles.label}>ITEM NAME</div>
                            <Form.Control className={styles.nmInput} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />

                            <Row className="mt-4">
                                <Col md={6}>
                                    <div className={styles.label}>CATEGORY</div>
                                    <Form.Control 
                                        list="categoryOptions"
                                        className={styles.nmInput} 
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})} 
                                    />
                                    <datalist id="categoryOptions">
                                        {categories.map(cat => <option key={cat} value={cat} />)}
                                    </datalist>
                                </Col>
                                <Col md={6}>
                                    <div className={styles.label}>STATUS</div>
                                    <div className="d-flex gap-2">
                                        {['정상', '파손', '폐기'].map(s => (
                                            <Button key={s} className={formData.status === s ? styles.nmBtnMain : styles.nmBtnRound} style={{flex: 1, width: 'auto', marginTop: 0}} onClick={() => setFormData({...formData, status: s})}>{s}</Button>
                                        ))}
                                    </div>
                                </Col>
                            </Row>

                            <div className="mt-4">
                                <div className={styles.label}>STORAGE LOCATION</div>
                                <Form.Control 
                                    list="locationOptions"
                                    className={styles.nmInput} 
                                    value={formData.location || ''} 
                                    onChange={e => setFormData({...formData, location: e.target.value})} 
                                />
                                <datalist id="locationOptions">
                                    {locations.map(loc => <option key={loc} value={loc} />)}
                                </datalist>
                            </div>

                            <div className="mt-4">
                                <div className={styles.label}>SERVICE CONNECTION</div>
                                <Form.Select className={styles.nmInput} value={selectedServiceId} onChange={handleServiceChange}>
                                    <option value="">연결 안 함</option>
                                    {serviceList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                                    <option value="custom">직접 입력 (커스텀)</option>
                                </Form.Select>
                                {selectedServiceId && (
                                    <Row className="mt-3 g-2">
                                        <Col xs={4}>
                                            <Form.Control className={styles.nmInput} placeholder="서비스명" value={formData.serviceName || ''} onChange={e => handleCustomInput('serviceName', e.target.value)} />
                                        </Col>
                                        <Col xs={8}>
                                            <Form.Control className={styles.nmInput} placeholder="연결 URL (https://...)" value={formData.customUrl || ''} onChange={e => handleCustomInput('customUrl', e.target.value)} />
                                        </Col>
                                    </Row>
                                )}
                            </div>

                            <div className="mt-4">
                                <div className={styles.label}>DATE MANAGEMENT</div>
                                <div className="d-flex gap-2 mb-3">
                                    <Button className={formData.timeType==='EXPIRATION' ? styles.nmBtnMain : styles.nmBtnRound} style={{flex: 1, width: 'auto', marginTop: 0}} onClick={()=>setFormData({...formData, timeType:'EXPIRATION'})}>유통기한</Button>
                                    <Button className={formData.timeType==='AGING' ? styles.nmBtnMain : styles.nmBtnRound} style={{flex: 1, width: 'auto', marginTop: 0}} onClick={()=>setFormData({...formData, timeType:'AGING'})}>숙성관리</Button>
                                </div>
                                <Row className="g-3">
                                    <Col xs={6}>
                                        <small className="ms-2 text-muted fw-bold">기준일 (제조/입고)</small>
                                        <Form.Control type="date" className={styles.nmInput} value={formData.referenceDate} onChange={handleReferenceDateChange} />
                                    </Col>
                                    <Col xs={6}>
                                        <small className="ms-2 text-muted fw-bold">{formData.timeType==='AGING'?'숙성 기간 (일)':'만료일자'}</small>
                                        {formData.timeType === 'AGING' ? 
                                            <Form.Control type="number" className={styles.nmInput} placeholder="숫자 입력" value={daysToAdd} onChange={handleDaysChange} /> :
                                            <Form.Control type="date" className={styles.nmInput} value={formData.expiryDate} onChange={handleExpiryDateChange} />
                                        }
                                    </Col>
                                </Row>
                                {formData.timeType === 'AGING' && (
                                    <div className="mt-2 ms-2 small text-primary fw-bold">
                                        계산된 만료일: {formData.expiryDate || '기준일을 선택하세요'}
                                    </div>
                                )}

                                {/* 메모 (DESCRIPTION) 섹션 추가 */}
                                <div className="mt-4">
                                    <div className={styles.label}>MEMO / DESCRIPTION</div>
                                    <Form.Control 
                                        as="textarea" 
                                        rows={3} 
                                        className={styles.nmInput} 
                                        placeholder="상세 정보를 입력하세요..."
                                        value={formData.description || ''} 
                                        onChange={e => setFormData({...formData, description: e.target.value})} 
                                    />
                                </div>

                                {/* 자동 삭제 설정 */}
                                <div className="mt-4 p-3" style={{borderRadius: '15px', background: '#e0e5ec', boxShadow: 'inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #ffffff'}}>
                                    <Form.Check 
                                        type="switch"
                                        id="auto-delete-switch"
                                        label="만료 시 자동 삭제"
                                        className="fw-bold text-muted"
                                        checked={formData.autoDelete}
                                        onChange={e => setFormData({...formData, autoDelete: e.target.checked})}
                                    />
                                    <small className="text-muted d-block mt-1" style={{fontSize: '0.75rem'}}>
                                        * 활성화 시 만료일이 지나면 목록에서 자동으로 제거됩니다.
                                    </small>
                                </div>
                            </div>

                            <Button className={`${styles.nmBtnMain} w-100 mt-5`} onClick={handleUpdate} disabled={isUploading}>
                                {isUploading ? "SAVING..." : "UPDATE PRODUCT"}
                            </Button>
                        </Col>
                    </Row>
                </div>
            </Container>
            <canvas ref={canvasRef} className="d-none"></canvas>
        </div>
    );
};

export default InventoryEdit;