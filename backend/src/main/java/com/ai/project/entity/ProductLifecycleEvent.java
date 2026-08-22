package com.ai.project.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "product_lifecycle_events")
public class ProductLifecycleEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    private String category;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "service_name")
    private String serviceName;

    @Column(name = "target_url", columnDefinition = "TEXT")
    private String targetUrl;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
