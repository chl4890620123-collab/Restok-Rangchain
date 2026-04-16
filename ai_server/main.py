import time
import json
import re
import yaml
import os
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

app = FastAPI()

def initialize_gemini():
    try:
        # 1. 파일 경로 추적 로직 (명헌님 의견 적극 반영)
        current_file_path = os.path.abspath(__file__)
        ai_server_dir = os.path.dirname(current_file_path)
        project_root = os.path.dirname(ai_server_dir)
        
        # 2. backend 폴더 진입 (이미지 구조: ResTok/backend/...)
        yml_path = os.path.join(project_root, "backend", "src", "main", "resources", "application.yml")
        
        print(f"🔍 설정 파일 탐색 중: {yml_path}")

        if not os.path.exists(yml_path):
            # 대소문자 문제나 폴더명 오타 방지를 위해 디버깅 정보 강화
            raise FileNotFoundError(f"yml 파일을 찾을 수 없습니다. 경로: {yml_path}")

        with open(yml_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)
            
        # 3. 명헌님의 yml 계층 구조 파싱
        api_key = config.get('ai', {}).get('google', {}).get('gemini', {}).get('api-key')
        
        if not api_key:
            raise ValueError("application.yml 내에 'ai.google.gemini.api-key' 설정이 없습니다.")
        
        genai.configure(api_key=api_key)
        print(f"✅ 백엔드 설정 로드 성공! API Key: {api_key[:10]}...")
        
        # 4. 모델 버전 (명헌님 요청: gemini-2.5-flash)
        return genai.GenerativeModel('gemini-2.5-flash')
    
    except Exception as e:
        print(f"❌ 초기화 실패: {e}")
        return None

# 전역 모델 객체
model = initialize_gemini()

# --- CORS 설정 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/ai/analyze-receipt")
async def analyze_receipt(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="AI 초기화 실패. 서버 로그를 확인하세요.")
        
    try:
        content = await file.read()
        # MIME 타입이 가끔 image/jpg 등으로 들어오는 경우 처리
        image_data = {"mime_type": file.content_type or "image/jpeg", "data": content}
        
        prompt = """
        영수증 이미지를 분석하여 상품 리스트를 JSON 배열로 반환하세요.
        - 필드: name, category, stock, expiryDate
        - 형식: [{"name": "품목명", "category": "식품", "stock": 1, "expiryDate": "2026-04-21"}]
        - 반드시 JSON만 출력하세요.
        """

        response = model.generate_content([prompt, image_data])
        
        # ✅ 보완: 응답 텍스트 파싱 전처리 (정규식 사용)
        ai_text = response.text
        json_match = re.search(r'\[.*\]', ai_text, re.DOTALL)
        
        if json_match:
            clean_json = json_match.group()
            return json.loads(clean_json)
        else:
            # 정규식 실패 시 기존 방식 시도
            clean_json = re.sub(r'```json|```', '', ai_text).strip()
            return json.loads(clean_json)

    except Exception as e:
        print(f"❌ 분석 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)