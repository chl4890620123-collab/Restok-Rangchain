package com.ai.project.repository;

import com.ai.project.entity.ProductLifecycleEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ProductLifecycleEventRepository extends JpaRepository<ProductLifecycleEvent, Long> {
    List<ProductLifecycleEvent> findByUserIdOrderByCreatedAtDesc(String userId);

    List<ProductLifecycleEvent> findByProductIdAndUserIdOrderByCreatedAtDesc(Long productId, String userId);

    List<ProductLifecycleEvent> findTop20ByUserIdAndActionNotInOrderByCreatedAtDesc(
            String userId,
            Collection<String> excludedActions
    );
}
