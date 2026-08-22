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

        String email = oAuth2User.getAttribute("email");
        String googleName = oAuth2User.getAttribute("name");

        if (email == null || email.isBlank()) {
            throw new OAuth2AuthenticationException("Google 계정 이메일을 확인할 수 없습니다.");
        }

        userRepository.findByUsername(email)
                .orElseGet(() -> {
                    log.info("신규 Google 사용자 등록: {}", email);
                    User newUser = User.builder()
                            .username(email)
                            .password(null)
                            .name(googleName)
                            .role("ROLE_USER")
                            .categories(new ArrayList<>())
                            .locations(new ArrayList<>())
                            .build();
                    return userRepository.save(newUser);
                });

        return oAuth2User;
    }
}
