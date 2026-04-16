/* src/pages/NotFound.js */
import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

const NotFound = () => {
    return (
        <div className="notfound-wrap">
            <div className="notfound-card">
                <h1 className="notfound-code">404</h1>
                <div className="notfound-icon">🥕</div>
                <p className="notfound-message">요청하신 페이지를 찾을 수 없습니다.</p>
                <p className="notfound-sub">
                    주소가 잘못되었거나, 삭제된 페이지일 수 있습니다.<br/>
                    홈으로 돌아가 안전하게 재고를 관리하세요.
                </p>
                <Link to="/" className="notfound-btn">홈으로 돌아가기</Link>
            </div>
        </div>
    );
};

export default NotFound;