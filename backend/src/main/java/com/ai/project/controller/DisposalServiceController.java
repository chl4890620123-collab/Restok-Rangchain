package com.ai.project.controller;

import com.ai.project.entity.DisposalService;
import com.ai.project.repository.DisposalServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class DisposalServiceController {

    private final DisposalServiceRepository disposalServiceRepository;

    @GetMapping
    public ResponseEntity<List<DisposalService>> getAllServices(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return ResponseEntity.ok(disposalServiceRepository.findByUserId(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<?> createService(
            @RequestBody DisposalService service,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        String name = trimToNull(service.getName());
        String type = trimToNull(service.getType());
        String normalizedUrl = normalizeHttpUrl(service.getUrl());

        if (name == null || type == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "서비스 이름과 목적을 입력해주세요."));
        }

        if (normalizedUrl == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "http 또는 https URL을 입력해주세요."));
        }

        String userId = authentication.getName();
        if (disposalServiceRepository.existsByUserIdAndUrl(userId, normalizedUrl)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "이미 등록한 URL입니다."));
        }

        service.setUserId(userId);
        service.setName(name);
        service.setType(type);
        service.setUrl(normalizedUrl);

        DisposalService saved = disposalServiceRepository.save(service);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteService(
            @PathVariable("id") Long id,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = authentication.getName();
        return disposalServiceRepository.findById(id)
                .filter(service -> service.getUserId().equals(userId))
                .map(service -> {
                    disposalServiceRepository.delete(service);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }

    private String normalizeHttpUrl(String rawUrl) {
        String value = trimToNull(rawUrl);
        if (value == null) return null;

        if (!value.matches("(?i)^https?://.*")) {
            value = "https://" + value;
        }

        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null ||
                    !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
                return null;
            }
            return uri.normalize().toString();
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
