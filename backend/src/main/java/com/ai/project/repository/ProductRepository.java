package com.ai.project.repository;

import com.ai.project.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // ✅ 1. 내 물건만 유효기간 순으로 정렬 (리스트 조회용)
    List<Product> findByUserIdOrderByExpiryDateAsc(String userId);

    // ✅ 2. 내 물건 중에서만 QR 코드로 찾기 (남의 QR 스캔 방지)
    Optional<Product> findByQrCodeDataAndUserId(String qrCodeData, String userId);

    // ✅ 3. 특정 사용자의 만료된 데이터 찾기 (실시간 삭제/알림용)
    List<Product> findByUserIdAndExpiryDateLessThanEqualAndAutoDeleteTrue(String userId, String date);

    // 4. 전체 시스템 자동 삭제 스케줄러용 (이건 관리자용/시스템용이라 userId가 없어도 됩니다)
    List<Product> findByExpiryDateLessThanEqualAndAutoDeleteTrue(String date);

    // 5. 이미지 파일 중복 체크 (이건 파일명 기준이라 유지해도 무방합니다)
    long countByImageUrl(String imageUrl);

    // ✅ 6. 내 물건 상세 조회 (수정/삭제 시 보안 검증용)
    Optional<Product> findByIdAndUserId(Long id, String userId);
}