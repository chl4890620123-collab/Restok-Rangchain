package com.ai.project.service;

import com.ai.project.entity.User;
import com.ai.project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // 구글에서 제공하는 정보 추출
        String email = oAuth2User.getAttribute("email");
        String googleName = oAuth2User.getAttribute("name");

        log.info("🌐 구글 로그인 시도: {}", email);

        // DB에 유저가 없으면 자동 회원가입 (이메일을 username으로 사용)
        userRepository.findByUsername(email)
                .orElseGet(() -> {
                    log.info("🆕 신규 구글 유저 등록: {}", email);
                    User newUser = User.builder()
                            .username(email)
                            .password(null) // 소셜 로그인은 비밀번호 불필요
                            .name(googleName) // 📍 이제 User 엔티티에 필드가 있어 에러가 나지 않습니다.
                            .role("USER")
                            .categories(new ArrayList<>())
                            .locations(new ArrayList<>())
                            .build();
                    return userRepository.save(newUser);
                });

        return oAuth2User;
    }
}