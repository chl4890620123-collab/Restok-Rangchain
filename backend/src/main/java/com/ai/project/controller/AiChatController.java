package com.ai.project.controller;

import com.ai.project.service.AiChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    /**
     * 프론트엔드(React)에서 전송한 메시지를 받아 해당 사용자의 재고 데이터를 기반으로 AI 응답 반환
     */
    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> chatWithAi(
            @RequestBody Map<String, String> request,
            Principal principal) { // ✅ 로그인한 사용자 정보를 가져오기 위해 Principal 추가

        String message = request.getOrDefault("message", "");

        if (message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "메시지를 입력해주세요."));
        }

        // ✅ 1. 로그인 여부 확인 및 userId 추출
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("reply", "🤖 로그인이 필요한 서비스입니다."));
        }

        // Security 설정에 따라 principal.getName()은 사용자의 ID(String)를 반환합니다.
        String userId = principal.getName();

        // ✅ 2. 서비스 로직 호출 시 userId를 함께 전달
        String aiReply = aiChatService.getAiResponse(message, userId);

        return ResponseEntity.ok(Map.of("reply", aiReply));
    }
}