package com.ai.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling; // 1. 임포트 추가

@SpringBootApplication
@EnableScheduling
public class AiProjectApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiProjectApplication.class, args);
    }
}
