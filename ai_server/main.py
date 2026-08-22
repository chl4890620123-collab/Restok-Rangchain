import asyncio
import json
import os
import re
from typing import Any

import google.generativeai as genai
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Restok AI Service", version="2.0.0")

MAX_IMAGE_BYTES = int(os.getenv("AI_MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


def initialize_gemini():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


model = initialize_gemini()

cors_origins = [
    origin.strip()
    for origin in os.getenv("AI_CORS_ORIGINS", "").split(",")
    if origin.strip()
]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok" if model is not None else "degraded",
        "geminiConfigured": model is not None,
    }


def parse_json_array(text: str):
    clean = re.sub(r"```(?:json)?|```", "", text, flags=re.IGNORECASE).strip()

    try:
        parsed = json.loads(clean)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("items"), list):
            return parsed["items"]
    except json.JSONDecodeError:
        pass

    match = re.search(r"\[.*\]", clean, re.DOTALL)
    if not match:
        raise ValueError("AI 응답에서 상품 배열을 찾지 못했습니다.")

    parsed = json.loads(match.group())
    if not isinstance(parsed, list):
        raise ValueError("AI 응답 형식이 배열이 아닙니다.")
    return parsed


@app.post("/api/ai/analyze-receipt")
async def analyze_receipt(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY가 설정되지 않았습니다.")

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="JPEG, PNG, WEBP 이미지만 지원합니다.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 이미지 파일입니다.")
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="이미지 파일 크기가 허용 범위를 초과했습니다.")

    prompt = """
영수증 이미지를 분석하여 실제로 확인되는 상품만 JSON 배열로 반환하세요.
각 항목은 다음 필드를 사용합니다.
- name: 상품명
- category: 상품 카테고리. 불확실하면 "미분류"
- stock: 수량. 불확실하면 1
- expiryDate: 이미지에서 확인 가능한 경우 YYYY-MM-DD, 확인할 수 없으면 빈 문자열

추측으로 유통기한을 만들지 마세요.
반드시 JSON 배열만 반환하세요.
예시: [{"name":"우유","category":"식품","stock":1,"expiryDate":"2026-08-25"}]
""".strip()

    image_data = {"mime_type": content_type, "data": content}

    try:
        response = await asyncio.to_thread(model.generate_content, [prompt, image_data])
        items = parse_json_array(response.text)
        return items
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="AI 분석 결과를 구조화하지 못했습니다.")
    except Exception:
        raise HTTPException(status_code=502, detail="영수증 AI 분석에 실패했습니다.")
