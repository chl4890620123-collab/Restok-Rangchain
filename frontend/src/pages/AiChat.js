import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Form, Spinner } from 'react-bootstrap';
import styles from './AiChat.module.css'; // 위에서 만든 CSS 임포트

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const AiChat = () => {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: '안녕하세요! 재고 관리 비서입니다. 궁금한 품목의 유통기한이나 수량을 물어보세요! 🥕' }
    ]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);

    // 자동 스크롤 로직 유지
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // 음성 인식 설정 로직 유지
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'ko-KR';
            recognition.interimResults = true; 
            recognition.onresult = (e) => setInput(e.results[0][0].transcript);
            recognition.onerror = () => setIsRecording(false);
            recognition.onend = () => setIsRecording(false);
            recognitionRef.current = recognition;
        }
        return () => recognitionRef.current && recognitionRef.current.abort();
    }, []);

    const toggleRecording = useCallback(() => {
        if (!recognitionRef.current) return alert('마이크를 지원하지 않습니다.');
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    }, [isRecording]);

    const handleSend = async (e) => {
        e?.preventDefault();
        const msgText = input.trim();
        if (!msgText || isLoading) return;

        setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: msgText }]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msgText }),
                credentials: 'include' 
            });
            const data = await res.json();
            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                sender: 'ai', 
                text: data.reply || "죄송합니다. 응답을 생성하지 못했습니다." 
            }]);
        } catch (error) {
            setMessages(prev => [...prev, { 
                id: Date.now() + 1, 
                sender: 'ai', 
                text: "🤖 서버와 연결할 수 없습니다. 백엔드를 확인해주세요!" 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={styles.chatCard}>
            <Card.Header className={styles.chatHeader}>
                <h5 className={styles.headerTitle}> AI 재고 관리 비서</h5>
            </Card.Header>

            <Card.Body ref={scrollRef} className={styles.chatBody}>
                {messages.map((m) => (
                    <div key={m.id} className={`${styles.messageRow} ${m.sender === 'user' ? styles.userRow : styles.aiRow}`}>
                        <div className={`${styles.bubble} ${m.sender === 'user' ? styles.userBubble : styles.aiBubble}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className={styles.aiRow}>
                        <Spinner animation="grow" size="sm" variant="warning" className="ms-3" />
                    </div>
                )}
            </Card.Body>

            <Card.Footer className={styles.chatFooter}>
                <Form onSubmit={handleSend}>
                    <div className={styles.inputGroup}>
                        <Button 
                            variant={isRecording ? 'danger' : 'light'} 
                            onClick={toggleRecording}
                            className={styles.micBtn}
                        >
                            {isRecording ? '🛑' : '🎙️'}
                        </Button>
                        <Form.Control 
                            type="text" 
                            placeholder={isRecording ? "듣고 있어요..." : "비서에게 질문하기..."} 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)}
                            className={styles.chatInput}
                        />
                        <Button type="submit" className={styles.sendBtn} disabled={isLoading}>
                            {isLoading ? '...' : '전송'}
                        </Button>
                    </div>
                </Form>
            </Card.Footer>
        </Card>
    );
};

export default AiChat;