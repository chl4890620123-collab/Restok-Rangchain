package com.ai.project.config;

import com.ai.project.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private static final Logger logger = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 1. 요청 헤더에서 Authorization 확인
        String header = request.getHeader("Authorization");

        // 📍 토큰이 아예 없거나 Bearer로 시작하지 않으면 즉시 통과
        // -> 이렇게 해야 구글 로그인 직후 세션 기반 인증(JSESSIONID)이 작동할 기회를 얻습니다.
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // "Bearer " 이후의 실제 토큰 문자열만 추출
            String token = header.substring(7);

            // 📍 프론트엔드 예외 처리 (문자열 "undefined" 등이 들어오는 경우 방지)
            if (token.isEmpty() || "undefined".equals(token) || "null".equals(token)) {
                filterChain.doFilter(request, response);
                return;
            }

            // 2. JWT 토큰 유효성 검증
            if (jwtUtil.validateToken(token)) {
                String username = jwtUtil.extractUsername(token);

                // 3. 스프링 시큐리티 컨텍스트에 인증 정보 등록
                // (이후 컨트롤러에서 Authentication 객체로 유저 정보를 꺼낼 수 있음)
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(username, null, new ArrayList<>());

                SecurityContextHolder.getContext().setAuthentication(auth);
                logger.info("✅ JWT 인증 성공: {}", username);
            }

        } catch (Exception e) {
            // 검증 실패 시 로그만 남기고 다음 필터로 넘김 (인증 안 된 상태로 진행)
            logger.error("❌ JWT 인증 실패: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}