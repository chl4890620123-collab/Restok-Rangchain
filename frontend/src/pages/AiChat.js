import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Form, Spinner } from 'react-bootstrap';
import api from '../api';
import styles from './AiChat.module.css';

const AiChat = () => {
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: '안녕하세요! 보유 물품과 최근 처리 이력을 바탕으로 다음 행동을 함께 판단해드릴게요. 🥕' }
    ]);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

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
            const res = await api.post('/api/chat/ask', { message: msgText });
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: res.data?.reply || '죄송합니다. 응답을 생성하지 못했습니다.'
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: error.response?.data?.reply || '🤖 서버와 연결할 수 없습니다. 백엔드와 API 키 설정을 확인해주세요.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={styles.chatCard}>
            <Card.Header className={styles.chatHeader}>
                <h5 className={styles.headerTitle}>AI 물품 관리 보조</h5>
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
                            placeholder={isRecording ? '듣고 있어요...' : '예: 먼저 처리해야 할 물건이 뭐야?'}
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
