package com.ai.project.service;

import com.ai.project.dto.LoginRequest;
import com.ai.project.dto.SignupRequest;
import com.ai.project.entity.User;
import com.ai.project.repository.UserRepository;
import com.ai.project.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil; // 토큰 발급 모듈
    // private final PasswordEncoder passwordEncoder; // Security Config에서 빈 주입 예정


    public String authenticate(LoginRequest request) {
        // 1. 유저 유무 조회
        Optional<User> optionalUser = userRepository.findByUsername(request.getUsername());
        if (optionalUser.isEmpty()) {
            throw new IllegalArgumentException("존재하지 않는 사용자입니다.");
        }

        User user = optionalUser.get();

        // 2. 비밀번호 일치 여부 확인
        // if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
        if (!user.getPassword().equals(request.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // 3. 토큰 생성 후 반환 (username, role 기반)
        return jwtUtil.generateToken(user.getUsername(), user.getRole());
    }

    /**
     * 회원가입 로직: 중복 확인 후 비밀번호를 암호화하여 DB에 저장합니다.
     */
    public void registerUser(SignupRequest request) {
        // 1. 아이디 중복 체크
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        }

        // 2. 비밀번호 암호화 후 엔티티 생성
        // String encodedPw = passwordEncoder.encode(request.getPassword());
        User newUser = User.builder()
                .username(request.getUsername())
                .password(request.getPassword()) // encodedPw
                .role("ROLE_USER") // 가입 시 기본 권한
                .build();

        // 3. DB에 저장 (JPA save 호출 역할)
        userRepository.save(newUser);
    }
}
