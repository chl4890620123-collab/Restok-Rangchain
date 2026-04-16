package com.ai.project.controller;

import com.ai.project.entity.User;
import com.ai.project.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/user-settings")
@RequiredArgsConstructor
public class UserSettingController {

    private final UserRepository userRepository;

    /**
     * 📍 JWT 통합 후의 핵심 로직:
     * 이제 모든 유저는 JwtAuthenticationFilter를 거치면서
     * authentication.getName()에 자신의 식별자(이메일 혹은 아이디)를 가지게 됩니다.
     */
    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            log.warn("⚠️ 인증 정보가 없습니다.");
            return null;
        }

        // JWT 필터에서 등록한 username(또는 email)을 가져옵니다.
        String identifier = authentication.getName();
        log.info("🔍 DB 유저 조회 (Identifier): {}", identifier);

        return userRepository.findByUsername(identifier).orElse(null);
    }

    @GetMapping
    public ResponseEntity<?> getSettings(Authentication authentication) {
        try {
            User user = getCurrentUser(authentication);
            if (user == null) {
                log.error("❌ DB에서 유저를 찾을 수 없습니다.");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not found");
            }

            return ResponseEntity.ok(Map.of(
                    "categories", user.getCategories() != null ? user.getCategories() : new ArrayList<>(),
                    "locations", user.getLocations() != null ? user.getLocations() : new ArrayList<>()
            ));
        } catch (Exception e) {
            log.error("🔥 설정 로드 에러: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }

    @PostMapping("/categories")
    public ResponseEntity<?> addCategory(@RequestBody Map<String, String> body, Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String newCategory = body.get("name");
        if (newCategory != null && !newCategory.trim().isEmpty()) {
            List<String> cats = user.getCategories();
            if (cats == null) cats = new ArrayList<>();

            if (!cats.contains(newCategory)) {
                cats.add(newCategory);
                // JPA의 더티 체킹이나 명시적 저장을 위해 다시 설정
                userRepository.save(user);
            }
            return ResponseEntity.ok(cats);
        }
        return ResponseEntity.badRequest().build();
    }

    @DeleteMapping("/categories/{name}")
    public ResponseEntity<?> deleteCategory(@PathVariable String name, Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<String> cats = user.getCategories();
        if (cats != null && cats.contains(name)) {
            cats.remove(name);
            userRepository.save(user);
            return ResponseEntity.ok(cats);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/locations")
    public ResponseEntity<?> addLocation(@RequestBody Map<String, String> body, Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String newLocation = body.get("name");
        if (newLocation != null && !newLocation.trim().isEmpty()) {
            List<String> locs = user.getLocations();
            if (locs == null) locs = new ArrayList<>();

            if (!locs.contains(newLocation)) {
                locs.add(newLocation);
                userRepository.save(user);
            }
            return ResponseEntity.ok(locs);
        }
        return ResponseEntity.badRequest().build();
    }

    @DeleteMapping("/locations/{name}")
    public ResponseEntity<?> deleteLocation(@PathVariable String name, Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        List<String> locs = user.getLocations();
        if (locs != null && locs.contains(name)) {
            locs.remove(name);
            userRepository.save(user);
            return ResponseEntity.ok(locs);
        }
        return ResponseEntity.notFound().build();
    }
}