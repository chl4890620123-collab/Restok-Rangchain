package com.ai.project.dto;

import lombok.Data;

/**
 * [표준 아키텍처] 회원가입 요청 데이터 전송 객체 (DTO)
 * 프론트에서 받은 비밀번호(password)를 받아와서 서비스 단에서 암호화 처리 후 DB에 저장합니다.
 */
@Data
public class SignupRequest {
    // 추후 유효성 검사 @NotBlank, @Email 등 부착
    private String username;
    private String password;
}
