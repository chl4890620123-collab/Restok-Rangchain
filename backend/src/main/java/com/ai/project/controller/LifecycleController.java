package com.ai.project.controller;

import com.ai.project.dto.LifecycleActionRequest;
import com.ai.project.entity.Product;
import com.ai.project.entity.ProductLifecycleEvent;
import com.ai.project.repository.ProductLifecycleEventRepository;
import com.ai.project.repository.ProductRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/lifecycle")
@RequiredArgsConstructor
public class LifecycleController {

    private static final Set<String> ALLOWED_ACTIONS = Set.of(
            "USED", "SOLD", "DONATED", "RECYCLED", "DISPOSED", "REPAIRED", "TRANSFERRED", "AUTO_EXPIRED"
    );

    private static final Set<String> STOCK_DECREASING_ACTIONS = Set.of(
            "USED", "SOLD", "DONATED", "RECYCLED", "DISPOSED", "TRANSFERRED", "AUTO_EXPIRED"
    );

    private final ProductRepository productRepository;
    private final ProductLifecycleEventRepository lifecycleEventRepository;

    @GetMapping("/history")
    public ResponseEntity<List<ProductLifecycleEvent>> getHistory(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(
                lifecycleEventRepository.findByUserIdOrderByCreatedAtDesc(authentication.getName())
        );
    }

    @GetMapping("/products/{productId}")
    public ResponseEntity<List<ProductLifecycleEvent>> getProductHistory(
            @PathVariable Long productId,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(
                lifecycleEventRepository.findByProductIdAndUserIdOrderByCreatedAtDesc(
                        productId,
                        authentication.getName()
                )
        );
    }

    @Transactional
    @PostMapping("/products/{productId}/actions")
    public ResponseEntity<?> recordAction(
            @PathVariable Long productId,
            @Valid @RequestBody LifecycleActionRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = authentication.getName();
        Product product = productRepository.findByIdAndUserId(productId, userId).orElse(null);
        if (product == null) {
            return ResponseEntity.notFound().build();
        }

        String action = request.getAction().trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_ACTIONS.contains(action)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "지원하지 않는 처리 유형입니다.",
                    "allowedActions", ALLOWED_ACTIONS
            ));
        }

        if (request.getQuantity() > product.getStock()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "처리 수량이 현재 보유 수량보다 많습니다.",
                    "currentStock", product.getStock()
            ));
        }

        ProductLifecycleEvent event = ProductLifecycleEvent.builder()
                .productId(product.getId())
                .userId(userId)
                .productName(product.getName())
                .category(product.getCategory())
                .action(action)
                .quantity(request.getQuantity())
                .serviceName(blankToNull(request.getServiceName()))
                .targetUrl(blankToNull(request.getTargetUrl()))
                .note(blankToNull(request.getNote()))
                .build();

        ProductLifecycleEvent savedEvent = lifecycleEventRepository.save(event);

        int remaining = product.getStock();
        if (STOCK_DECREASING_ACTIONS.contains(action)) {
            remaining = product.getStock() - request.getQuantity();
            product.setStock(remaining);
            if (remaining == 0) {
                product.setStatus("처리완료");
            }
            productRepository.save(product);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "event", savedEvent,
                "remainingStock", remaining,
                "stockChanged", STOCK_DECREASING_ACTIONS.contains(action)
        ));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
