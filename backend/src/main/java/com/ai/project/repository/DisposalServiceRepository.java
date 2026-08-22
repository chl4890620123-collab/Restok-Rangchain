package com.ai.project.repository;

import com.ai.project.entity.DisposalService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisposalServiceRepository extends JpaRepository<DisposalService, Long> {

    List<DisposalService> findByUserId(String userId);

    boolean existsByUserIdAndUrl(String userId, String url);
}
