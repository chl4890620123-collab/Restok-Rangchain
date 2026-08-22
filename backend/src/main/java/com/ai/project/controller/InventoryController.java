package com.ai.project.controller;

import com.ai.project.entity.Product;
import com.ai.project.entity.ProductLifecycleEvent;
import com.ai.project.repository.ProductLifecycleEventRepository;
import com.ai.project.repository.ProductRepository;
import com.ai.project.service.CleanupService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final ProductRepository productRepository;
    private final ProductLifecycleEventRepository lifecycleEventRepository;
    private final CleanupService cleanupService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    private String getCurrentUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return null;
        }
        return auth.getName();
    }

    private String saveImageFile(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename() == null ? "image.jpg" : file.getOriginalFilename();
        String fileName = UUID.randomUUID() + "_" + original;
        File dest = new File(uploadDir, fileName);
        File parent = dest.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IOException("업로드 디렉터리를 생성하지 못했습니다.");
        }
        file.transferTo(dest);
        return "/uploads/" + fileName;
    }

    private void recordLifecycle(Product product, String action, int quantity, String note) {
        lifecycleEventRepository.save(ProductLifecycleEvent.builder()
                .productId(product.getId())
                .userId(product.getUserId())
                .productName(product.getName())
                .category(product.getCategory())
                .action(action)
                .quantity(quantity)
                .serviceName(product.getServiceName())
                .targetUrl(product.getCustomUrl())
                .note(note)
                .build());
    }

    @Transactional
    @PostMapping("/with-image")
    public ResponseEntity<?> createWithImage(
            @RequestPart(value = "image", required = false) MultipartFile file,
            @RequestPart("data") String productJson,
            Authentication auth) {

        String userId = getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            ObjectMapper mapper = new ObjectMapper();
            Product product = mapper.readValue(productJson, Product.class);
            product.setUserId(userId);

            if (file != null && !file.isEmpty()) {
                product.setImageUrl(saveImageFile(file));
            }

            Product savedProduct = productRepository.save(product);
            recordLifecycle(savedProduct, "REGISTERED", savedProduct.getStock(), "물품 등록");
            log.info("신규 물품 등록 완료 (User: {}): {}", userId, savedProduct.getName());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedProduct);

        } catch (IOException e) {
            log.error("재고 등록 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("데이터 형식이 올바르지 않습니다.");
        }
    }

    @Transactional
    @PostMapping("/with-image-batch")
    public ResponseEntity<?> createWithImageBatch(
            @RequestPart(value = "image", required = false) MultipartFile file,
            @RequestPart("dataList") String productsJson,
            Authentication auth) {

        String userId = getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            ObjectMapper mapper = new ObjectMapper();
            List<Product> productList = mapper.readValue(productsJson, new TypeReference<List<Product>>() {});

            byte[] imageBytes = (file != null && !file.isEmpty()) ? file.getBytes() : null;
            String originalFilename = (file != null && file.getOriginalFilename() != null)
                    ? file.getOriginalFilename()
                    : "ai_image.jpg";

            for (Product product : productList) {
                product.setUserId(userId);
                if (product.getImageUrl() == null && imageBytes != null) {
                    String newFileName = UUID.randomUUID() + "_" + originalFilename;
                    File dest = new File(uploadDir, newFileName);
                    File parent = dest.getParentFile();
                    if (parent != null && !parent.exists() && !parent.mkdirs()) {
                        throw new IOException("업로드 디렉터리를 생성하지 못했습니다.");
                    }
                    Files.write(dest.toPath(), imageBytes);
                    product.setImageUrl("/uploads/" + newFileName);
                }
            }

            List<Product> savedProducts = productRepository.saveAll(productList);
            for (Product saved : savedProducts) {
                recordLifecycle(saved, "REGISTERED", saved.getStock(), "AI/일괄 물품 등록");
            }

            log.info("다중 물품 등록 완료: {}건", savedProducts.size());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedProducts);

        } catch (IOException e) {
            log.error("다중 재고 등록 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("데이터 형식이 올바르지 않습니다.");
        }
    }

    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        String userId = getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return productRepository.findByIdAndUserId(id, userId).map(product -> {
            recordLifecycle(product, "REMOVED", product.getStock(), "오입력/관리 목적의 완전 삭제");

            if (product.getImageUrl() != null && product.getImageUrl().startsWith("/uploads/")) {
                String fileName = product.getImageUrl().replace("/uploads/", "");
                File imageFile = new File(uploadDir, fileName);
                if (imageFile.exists() && !imageFile.delete()) {
                    log.warn("관련 이미지 파일을 삭제하지 못했습니다: {}", fileName);
                }
            }

            productRepository.delete(product);
            return ResponseEntity.ok().body("삭제 이력을 남기고 품목을 제거했습니다.");
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchByQr(@RequestParam("qrCode") String qrCode, Authentication auth) {
        String userId = getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return productRepository.findByQrCodeDataAndUserId(qrCode, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<Product>> getAll(Authentication auth) {
        String userId = getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        cleanupService.runAutoDelete();
        return ResponseEntity.ok(productRepository.findByUserIdOrderByExpiryDateAsc(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getOne(@PathVariable Long id, Authentication auth) {
        String userId = getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return productRepository.findByIdAndUserId(id, userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestPart("product") String productJson,
            Authentication auth) {

        String userId = getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        try {
            ObjectMapper mapper = new ObjectMapper();
            Product details = mapper.readValue(productJson, Product.class);

            return productRepository.findByIdAndUserId(id, userId).map(product -> {
                product.setName(details.getName());
                product.setCategory(details.getCategory());
                product.setLocation(details.getLocation());
                product.setStock(details.getStock());
                product.setStatus(details.getStatus());
                product.setDescription(details.getDescription());
                product.setTimeType(details.getTimeType());
                product.setReferenceDate(details.getReferenceDate());
                product.setExpiryDate(details.getExpiryDate());
                product.setAutoDelete(details.isAutoDelete());
                product.setQrCodeData(details.getQrCodeData());
                product.setServiceName(details.getServiceName());
                product.setServiceType(details.getServiceType());
                product.setCustomUrl(details.getCustomUrl());

                if (file != null && !file.isEmpty()) {
                    try {
                        product.setImageUrl(saveImageFile(file));
                    } catch (IOException e) {
                        log.error("파일 저장 에러: {}", e.getMessage());
                    }
                }

                Product updatedProduct = productRepository.save(product);
                return ResponseEntity.ok(updatedProduct);
            }).orElse(ResponseEntity.notFound().build());

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("데이터 형식이 올바르지 않습니다.");
        }
    }
}
