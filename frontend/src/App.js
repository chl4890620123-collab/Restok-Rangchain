import React from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'; 
import { Container, Nav } from 'react-bootstrap';
import api from './api'; 
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import InventoryEdit from './pages/InventoryEdit';
import Inbound from './pages/Inbound';
import AiBatchInbound from './pages/AiBatchInbound';
import Scanner from './pages/Scanner';
import ServiceConfig from './pages/ServiceConfig';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AiChat from './pages/AiChat';
import './App.css';

function App() {
  const location = useLocation();
  
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const savedToken = localStorage.getItem('token');
  
  const params = new URLSearchParams(location.search);
  const hasUrlToken = params.has('token');

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      try {
        await api.post('/api/auth/logout');
      } catch (error) {
        console.error("로그아웃 서버 통신 실패:", error);
      } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user'); 
        window.location.href = '/login';
      }
    }
  };

  if (!savedToken && !isAuthPage && !hasUrlToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      {!isAuthPage && (
        <aside className="sidebar">
          {/* [수정] 로고 영역을 Link로 감싸서 클릭 시 대시보드로 이동하게 만듦 */}
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="sidebar-logo mb-4" style={{ cursor: 'pointer' }}>
              <h2 style={{ color: '#ff8a3d', fontWeight: '800' }}>ReStock</h2>
              <p className="text-muted small">AI 스마트 재고관리 시스템</p>
            </div>
          </Link>

          <Nav className="flex-column gap-2 flex-grow-1">
            <Nav.Link 
              as={Link} 
              to="/" 
              className={location.pathname === '/' || location.pathname === '/dashboard' ? 'active' : ''}
            >
              대시보드
            </Nav.Link>
            
            <Nav.Link 
              as={Link} 
              to="/inventory" 
              className={location.pathname.startsWith('/inventory') ? 'active' : ''}
            >
              재고 현황
            </Nav.Link>
            
            <Nav.Link as={Link} to="/inbound" className={location.pathname === '/inbound' ? 'active' : ''}> 신규 입고</Nav.Link>
            <Nav.Link as={Link} to="/scanner" className={location.pathname === '/scanner' ? 'active' : ''}> QR 스캐너</Nav.Link>
            <Nav.Link as={Link} to="/chat" className={location.pathname === '/chat' ? 'active' : ''}> AI 챗봇</Nav.Link>
            
            <div className="menu-divider my-3" style={{ height: '1px', backgroundColor: '#eee' }}></div>
            <p className="px-3 small fw-bold text-muted mb-2" style={{ fontSize: '0.75rem' }}>SYSTEM CONFIG</p>
            
            <Nav.Link as={Link} to="/services" className={location.pathname === '/services' ? 'active' : ''}> 처리 사이트 관리</Nav.Link>
            
            <Nav.Link 
              onClick={handleLogout} 
              className="mt-2 text-danger fw-bold" 
              style={{ cursor: 'pointer' }}
            >
              로그아웃
            </Nav.Link>
          </Nav>
        </aside>
      )}

      <main className="main-content" style={{ 
        marginLeft: isAuthPage ? '0' : '280px', 
        width: isAuthPage ? '100%' : 'calc(100% - 280px)',
        minHeight: '100vh'
      }}>
        <Container fluid className="py-2">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            <Route path="/inventory/edit/:id" element={<InventoryEdit />} />
            <Route path="/inventory" element={<Inventory />} />
            
            <Route path="/inbound" element={<Inbound />} />
            <Route path="/ai-batch-inbound" element={<AiBatchInbound />} /> 
            
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/services" element={<ServiceConfig />} />
            <Route path="/chat" element={<AiChat />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Container>
      </main>
    </div>
  );
}

export default App;