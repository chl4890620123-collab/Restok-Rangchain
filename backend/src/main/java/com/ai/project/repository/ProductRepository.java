package com.ai.project.repository;

import com.ai.project.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByUserIdOrderByExpiryDateAsc(String userId);

    List<Product> findByUserIdAndStockGreaterThanOrderByExpiryDateAsc(String userId, int stock);

    Optional<Product> findByQrCodeDataAndUserId(String qrCodeData, String userId);

    List<Product> findByUserIdAndExpiryDateLessThanEqualAndAutoDeleteTrue(String userId, String date);

    List<Product> findByExpiryDateLessThanEqualAndAutoDeleteTrue(String date);

    long countByImageUrl(String imageUrl);

    Optional<Product> findByIdAndUserId(Long id, String userId);
}
