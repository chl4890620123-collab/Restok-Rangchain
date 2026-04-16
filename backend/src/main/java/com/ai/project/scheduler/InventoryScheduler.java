package com.ai.project.scheduler;

import com.ai.project.service.CleanupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryScheduler {

    private final CleanupService cleanupService;

    // ✅ 1분마다 주기적으로 감시 (실시간 누락분 방지)
    @Scheduled(fixedRate = 60000, initialDelay = 5000)
    public void autoDeleteByDate() {
        log.info("⏰ [정기 스케줄러] 만료 데이터 체크 시작...");
        cleanupService.runAutoDelete();
    }
}