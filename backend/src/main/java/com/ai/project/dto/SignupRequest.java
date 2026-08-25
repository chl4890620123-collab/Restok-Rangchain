package com.ai.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 회원가입 요청 데이터 전송 객체.
 * 비밀번호는 서비스 계층에서 BCrypt로 암호화한 뒤 저장합니다.
 */
@Data
public class SignupRequest {
    @NotBlank(message = "아이디를 입력하세요.")
    @Size(max = 100, message = "아이디가 너무 깁니다.")
    private String username;

    @NotBlank(message = "비밀번호를 입력하세요.")
    @Size(max = 72, message = "비밀번호가 너무 깁니다.")
    private String password;
}
