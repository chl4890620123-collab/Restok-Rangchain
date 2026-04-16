package com.ai.project.controller;

import com.ai.project.dto.LoginRequest;
import com.ai.project.dto.SignupRequest;
import com.ai.project.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService; // 의존성 주입

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            // [비즈니스 로직 위임] 컨트롤러에는 로직이 없습니다.
            String jwtToken = authService.authenticate(loginRequest);
            return ResponseEntity.ok(Map.of(
                    "message", "로그인에 성공했습니다.",
                    "token", jwtToken // 실제 인증서
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DTO로 받은 아이디/비번을 서비스에서 중복 체크 후 저장(회원가입)하도록 합니다.
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest signupRequest) {
        try {
            authService.registerUser(signupRequest);
            return ResponseEntity.ok(Map.of("message", "회원가입이 성공적으로 완료되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
