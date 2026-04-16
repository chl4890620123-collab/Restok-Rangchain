package com.ai.project.service;

import com.ai.project.entity.Product;
import com.ai.project.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CleanupService {

    private final ProductRepository productRepository;

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Transactional
    public void runAutoDelete() {
        String today = LocalDate.now().toString();
        List<Product> targets = productRepository.findByExpiryDateLessThanEqualAndAutoDeleteTrue(today);

        if (!targets.isEmpty()) {
            targets.forEach(this::deleteProductAndFile);
            log.info("🗑️ [자동 정리] 만료 상품 {}건 삭제 완료 (기준일: {})", targets.size(), today);
        }
    }

    @Transactional
    public void deleteProductAndFile(Product product) {
        if (product == null) return;

        String imageUrl = product.getImageUrl();
        if (imageUrl != null && imageUrl.startsWith("/uploads/")) {
            if (productRepository.countByImageUrl(imageUrl) <= 1) {
                String fileName = imageUrl.replace("/uploads/", "");
                File file = new File(uploadDir + fileName);
                if (file.exists()) {
                    if (file.delete()) log.info("📁 파일 삭제 성공: {}", fileName);
                }
            }
        }
        productRepository.delete(product);
    }
}