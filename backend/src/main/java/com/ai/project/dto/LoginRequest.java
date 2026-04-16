package com.ai.project.dto;

import lombok.Data;

/**
 * [표준 아키텍처] 로그인 요청 데이터 전송 객체 (DTO)
 * 프론트엔드에서 날아오는 JSON 요청을 그대로 매핑
 */
@Data
public class LoginRequest {
    // 추후 유효성 검사 @NotBlank 부착
    private String username;
    private String password;
}
