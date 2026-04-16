package com.ai.project.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "product")
@JsonIgnoreProperties(ignoreUnknown = true) // JSON에 Entity에 없는 필드가 있어도 오류 내지 않음
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    /* 📍 핵심 수정: Access.READ_ONLY
       프론트엔드에서 보낸 임시 ID(문자열 등)가 서버의 Long id로 들어오려 할 때
       역직렬화 오류가 발생하는 것을 방지합니다.
       서버에서 클라이언트로 보낼 때만 포함됩니다.
    */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    private String name;
    private String category;
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String size;
    private String weight;

    @Builder.Default
    private int stock = 1; // 기본값 설정

    private String status;

    @Column(name = "image_url")
    private String imageUrl;

    private String url;

    @Column(name = "time_type")
    private String timeType;

    @Column(name = "reference_date")
    private String referenceDate;

    @Column(name = "expiry_date")
    private String expiryDate;

    @Column(name = "auto_delete")
    private boolean autoDelete;

    @Column(name = "service_name")
    private String serviceName;

    @Column(name = "service_type")
    private String serviceType;

    @Column(name = "custom_url")
    private String customUrl;

    @Column(name = "qr_code_data") // unique = true는 데이터 상황에 따라 선택
    private String qrCodeData;
}