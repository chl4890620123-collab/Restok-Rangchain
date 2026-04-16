package com.ai.project.controller;

import com.ai.project.entity.DisposalService;
import com.ai.project.repository.DisposalServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class DisposalServiceController {

    private final DisposalServiceRepository disposalServiceRepository;

    // 1. [조회] 내 계정으로 등록된 사이트 목록만 가져오기
    @GetMapping
    public ResponseEntity<List<DisposalService>> getAllServices(Authentication authentication) {
        // ✅ 인증 객체 체크: 로그인 안 되어 있으면 401 반환
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = authentication.getName(); // ✅ 유저 ID 추출
        return ResponseEntity.ok(disposalServiceRepository.findByUserId(userId));
    }

    // 2. [저장] 새로운 사이트 등록 시 내 ID 강제 주입
    @PostMapping
    public ResponseEntity<?> createService(
            @RequestBody DisposalService service,
            Authentication authentication) {

        // ✅ 인증 객체 체크: 여기서 NPE가 발생하지 않도록 막아줍니다.
        if (authentication == null || !authentication.isAuthenticated()) {
            log.error("❌ 미인증 사용자의 등록 시도");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        // ✅ 기존 로직 유지: 요청 데이터에 현재 로그인한 유저 ID를 심어줍니다.
        String userId = authentication.getName();
        service.setUserId(userId);

        DisposalService saved = disposalServiceRepository.save(service);
        return ResponseEntity.ok(saved);
    }

    // 3. [삭제] 내 사이트인지 확인 후 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteService(
            @PathVariable("id") Long id,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = authentication.getName();

        // ✅ 기존 로직 유지: 주인(userId)이 맞는지 검증 후 삭제
        return disposalServiceRepository.findById(id)
                .filter(service -> service.getUserId().equals(userId))
                .map(service -> {
                    disposalServiceRepository.delete(service);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.status(HttpStatus.FORBIDDEN).build());
    }
}