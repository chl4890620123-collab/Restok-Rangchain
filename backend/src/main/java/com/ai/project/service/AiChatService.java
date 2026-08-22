package com.ai.project.service;

import com.ai.project.entity.Product;
import com.ai.project.entity.ProductLifecycleEvent;
import com.ai.project.repository.ProductLifecycleEventRepository;
import com.ai.project.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final Set<String> AI_EXCLUDED_EVENTS = Set.of("REGISTERED", "REMOVED");

    @Value("${ai.google.gemini.api-key}")
    private String apiKey;

    @Value("${ai.google.gemini.url}")
    private String apiUrl;

    private final ProductRepository productRepository;
    private final ProductLifecycleEventRepository lifecycleEventRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public String getAiResponse(String userMessage, String userId) {
        try {
            if (apiKey == null || apiKey.isBlank()) {
                return "AI 기능을 사용하려면 GEMINI_API_KEY 설정이 필요합니다.";
            }

            List<Product> myProducts = productRepository
                    .findByUserIdAndStockGreaterThanOrderByExpiryDateAsc(userId, 0);

            List<ProductLifecycleEvent> recentEvents = lifecycleEventRepository
                    .findTop20ByUserIdAndActionNotInOrderByCreatedAtDesc(userId, AI_EXCLUDED_EVENTS);

            LocalDate today = LocalDate.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            String inventoryContext = myProducts.stream().map(product -> {
                String statusMsg;
                try {
                    String cleanedDate = product.getExpiryDate().replace("/", "-");
                    LocalDate expiryDate = LocalDate.parse(cleanedDate, formatter);
                    long daysLeft = ChronoUnit.DAYS.between(today, expiryDate);

                    if (daysLeft < 0) statusMsg = "유효기간 만료";
                    else if (daysLeft <= 7) statusMsg = "7일 이내 만료 임박";
                    else statusMsg = daysLeft + "일 남음";
                } catch (Exception e) {
                    statusMsg = "기한 미정";
                }

                return String.format(
                        "[품목: %s]\n- 수량: %d\n- 유효기한: %s (%s)\n- 보관위치: %s\n- 연결서비스: %s\n- 연결URL: %s\n- 메모: %s",
                        product.getName(),
                        product.getStock(),
                        product.getExpiryDate() != null ? product.getExpiryDate() : "미정",
                        statusMsg,
                        product.getLocation() != null ? product.getLocation() : "미지정",
                        product.getServiceName() != null ? product.getServiceName() : "없음",
                        product.getCustomUrl() != null ? product.getCustomUrl() : "없음",
                        product.getDescription() != null ? product.getDescription() : "없음"
                );
            }).collect(Collectors.joining("\n\n"));

            String lifecycleContext = recentEvents.stream()
                    .map(event -> String.format(
                            "- %s / %s / %d개 / %s / %s / %s",
                            event.getCreatedAt(),
                            event.getProductName(),
                            event.getQuantity(),
                            event.getAction(),
                            event.getServiceName() != null ? event.getServiceName() : "직접 처리",
                            event.getNote() != null ? event.getNote() : "메모 없음"
                    ))
                    .collect(Collectors.joining("\n"));

            String finalPrompt = "너는 개인 물품 생애주기 관리 서비스 'Restok'의 AI 보조자야. " +
                    "사용자가 보유한 물건과 최근 실제 처리 이력을 바탕으로, 불필요한 구매와 낭비를 줄이고 " +
                    "판매·기부·재활용·폐기 등 다음 행동을 판단하는 것을 돕는다.\n\n" +
                    "### 답변 원칙 ###\n" +
                    "1. 아래 제공된 사용자 데이터에 있는 사실만 확정적으로 말할 것.\n" +
                    "2. 수량과 날짜를 가능한 정확하게 언급할 것.\n" +
                    "3. 데이터가 부족하면 추측하지 말고 무엇이 부족한지 짧게 말할 것.\n" +
                    "4. 사용자가 물어본 내용에 필요한 범위만 답할 것.\n" +
                    "5. 외부 처리 서비스와 URL은 등록 정보가 있을 때만 구체적으로 언급할 것.\n" +
                    "6. 최근 처리 이력은 사용자의 실제 행동 기록이므로 반복되는 폐기/판매/기부 패턴이 있으면 근거와 함께 설명할 것.\n\n" +
                    "[현재 보유 물품]\n" +
                    (inventoryContext.isEmpty() ? "현재 등록된 보유 물품이 없습니다." : inventoryContext) + "\n\n" +
                    "[최근 실제 처리 이력]\n" +
                    (lifecycleContext.isEmpty() ? "아직 실제 처리 이력이 없습니다." : lifecycleContext) + "\n\n" +
                    "[사용자 질문]\n" + userMessage;

            return callGemini(finalPrompt);

        } catch (Exception e) {
            log.error("Restok AI 컨텍스트 생성 오류: ", e);
            return "데이터를 분석하는 중에 오류가 발생했습니다.";
        }
    }

    @SuppressWarnings("unchecked")
    private String callGemini(String promptText) {
        try {
            String requestUrl = apiUrl + "?key=" + apiKey;

            Map<String, Object> textPart = Map.of("text", promptText);
            Map<String, Object> content = Map.of("parts", List.of(textPart));
            Map<String, Object> requestBody = Map.of("contents", List.of(content));

            Map<String, Object> response = restTemplate.postForObject(requestUrl, requestBody, Map.class);

            if (response != null && response.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> firstCandidate = candidates.get(0);
                    Map<String, Object> candidateContent = (Map<String, Object>) firstCandidate.get("content");
                    List<Map<String, Object>> partsList = (List<Map<String, Object>>) candidateContent.get("parts");
                    if (partsList != null && !partsList.isEmpty() && partsList.get(0).get("text") != null) {
                        return partsList.get(0).get("text").toString();
                    }
                }
            }
            return "AI가 응답을 생성하지 못했습니다.";
        } catch (Exception e) {
            log.error("Gemini API 통신 실패: ", e);
            return "AI 보조 기능과 통신하는 중 오류가 발생했습니다.";
        }
    }
}
