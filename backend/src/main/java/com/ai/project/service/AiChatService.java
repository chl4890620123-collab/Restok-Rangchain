package com.ai.project.service;

import com.ai.project.entity.Product;
import com.ai.project.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    @Value("${ai.google.gemini.api-key}")
    private String apiKey;

    @Value("${ai.google.gemini.url}")
    private String apiUrl;

    private final ProductRepository productRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public String getAiResponse(String userMessage, String userId) {
        try {
            // ✅ 내 데이터만 유통기한 순으로 가져오기
            List<Product> myProducts = productRepository.findByUserIdOrderByExpiryDateAsc(userId);

            LocalDate today = LocalDate.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            // AI가 상세히 알 수 있도록 컨텍스트 구성
            String inventoryContext = myProducts.stream().map(product -> {
                String statusMsg;
                try {
                    String cleanedDate = product.getExpiryDate().replace("/", "-");
                    LocalDate expiryDate = LocalDate.parse(cleanedDate, formatter);
                    long daysLeft = ChronoUnit.DAYS.between(today, expiryDate);

                    if (daysLeft < 0) statusMsg = "유효기간 만료";
                    else if (daysLeft <= 7) statusMsg = "7일 이내 만료 임박!!";
                    else statusMsg = daysLeft + "일 남음";
                } catch (Exception e) {
                    statusMsg = "기한 미정";
                }

                return String.format(
                        "[품목: %s]\n- 수량: %d\n- 유효기한: %s (%s)\n- 보관위치: %s\n- 메모: %s",
                        product.getName(), product.getStock(), product.getExpiryDate(), statusMsg,
                        product.getLocation(),
                        (product.getDescription() != null ? product.getDescription() : "없음")
                );
            }).collect(Collectors.joining("\n\n"));

            String finalPrompt = "너는 재고 관리 시스템 'Restok'의 전문 비서야. 아래 제공된 사용자의 실제 재고 데이터를 바탕으로만 답변해.\n\n" +
                    "### 답변 원칙 ###\n" +
                    "1. 데이터의 수치와 날짜를 정확히 언급할 것.\n" +
                    "2. 메모에 적힌 특이사항을 답변에 활용할 것.\n" +
                    "3. 물어본 내용만 대답할것.\n\n" +
                    "[사용자 재고 데이터]\n" +
                    (inventoryContext.isEmpty() ? "현재 등록된 상품이 없습니다." : inventoryContext) + "\n\n" +
                    "[사용자 질문]\n" + userMessage;

            // ✅ 이제 callGemini를 정상적으로 호출합니다.
            return callGemini(finalPrompt);

        } catch (Exception e) {
            log.error("재고 데이터 로드 오류: ", e);
            return "🤖 데이터를 분석하는 중에 오류가 발생했습니다.";
        }
    } // 👈 getAiResponse 메서드 끝

    private String callGemini(String promptText) {
        try {
            String requestUrl = apiUrl + "?key=" + apiKey;

            Map<String, Object> textPart = Map.of("text", promptText);
            Map<String, Object> parts = Map.of("parts", List.of(textPart));
            Map<String, Object> contents = Map.of("contents", List.of(parts));

            log.info("Gemini API 호출 중...");
            Map<String, Object> response = restTemplate.postForObject(requestUrl, contents, Map.class);

            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.get(0);
                    Map<String, Object> content = (Map<String, Object>) firstCandidate.get("content");
                    List<Map<String, Object>> partsList = (List<Map<String, Object>>) content.get("parts");
                    return partsList.get(0).get("text").toString();
                }
            }
            return "🤖 AI가 응답을 생성하지 못했습니다.";
        } catch (Exception e) {
            log.error("Gemini API 통신 실패: ", e);
            return "🤖 AI 비서와 대화하는 중 오류가 발생했습니다.";
        }
    }

}