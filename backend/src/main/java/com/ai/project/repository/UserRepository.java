package com.ai.project.repository;

import com.ai.project.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Select * from users where username = ? 쿼리를 자동으로 생성해줌
    Optional<User> findByUsername(String username);

    // 아이디 중복 체크용 (true/false)
    boolean existsByUsername(String username);
}
