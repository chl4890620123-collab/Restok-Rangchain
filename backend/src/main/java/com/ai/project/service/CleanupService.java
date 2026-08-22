package com.ai.project.service;

import com.ai.project.entity.Product;
import com.ai.project.entity.ProductLifecycleEvent;
import com.ai.project.repository.ProductLifecycleEventRepository;
import com.ai.project.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CleanupService {

    private final ProductRepository productRepository;
    private final ProductLifecycleEventRepository lifecycleEventRepository;

    @Transactional
    public void runAutoDelete() {
        String today = LocalDate.now().toString();
        List<Product> targets = productRepository.findByExpiryDateLessThanEqualAndAutoDeleteTrue(today);

        int processed = 0;
        for (Product product : targets) {
            if (product.getStock() <= 0) {
                product.setAutoDelete(false);
                productRepository.save(product);
                continue;
            }

            lifecycleEventRepository.save(ProductLifecycleEvent.builder()
                    .productId(product.getId())
                    .userId(product.getUserId())
                    .productName(product.getName())
                    .category(product.getCategory())
                    .action("AUTO_EXPIRED")
                    .quantity(product.getStock())
                    .serviceName(product.getServiceName())
                    .targetUrl(product.getCustomUrl())
                    .note("설정된 자동 처리 기준일 도달")
                    .build());

            product.setStock(0);
            product.setStatus("자동처리");
            product.setAutoDelete(false);
            productRepository.save(product);
            processed++;
        }

        if (processed > 0) {
            log.info("[자동 처리] 만료 품목 {}건 lifecycle 이력 기록 완료 (기준일: {})", processed, today);
        }
    }

    @Transactional
    public void deleteProductAndFile(Product product) {
        if (product == null) return;
        productRepository.delete(product);
    }
}
