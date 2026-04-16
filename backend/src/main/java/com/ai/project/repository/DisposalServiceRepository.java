package com.ai.project.repository;

import com.ai.project.entity.DisposalService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DisposalServiceRepository extends JpaRepository<DisposalService, Long> {

    /**
     * ✅ 로그인한 사용자의 ID로 등록된 서비스 목록만 가져오기
     * Spring Data JPA가 메서드 이름을 분석하여 "WHERE user_id = ?" 쿼리를 자동으로 생성합니다.
     */
    List<DisposalService> findByUserId(String userId);
}