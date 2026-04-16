package com.ai.project.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "disposal_services")
public class DisposalService {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type; // 기부, 판매, 폐기 등
    private String name; // 사이트명 (예: 네이버)
    private String url;  // 연결 URL

    @Column(name = "user_id", nullable = false)
    private String userId;
}