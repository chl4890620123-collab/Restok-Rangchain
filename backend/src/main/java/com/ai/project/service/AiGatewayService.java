package com.ai.project.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class AiGatewayService {

    @Value("${ai.service.base-url}")
    private String aiServiceBaseUrl;

    private final ObjectMapper objectMapper;

    public JsonNode analyzeReceipt(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("분석할 이미지가 없습니다.");
        }

        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() == null ? "receipt.jpg" : file.getOriginalFilename();
            }
        };

        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(
                file.getContentType() == null ? MediaType.IMAGE_JPEG_VALUE : file.getContentType()
        ));

        HttpEntity<ByteArrayResource> filePart = new HttpEntity<>(resource, fileHeaders);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", filePart);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<String> response = restTemplate.postForEntity(
                aiServiceBaseUrl + "/api/ai/analyze-receipt",
                new HttpEntity<>(body, headers),
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IllegalStateException("AI 분석 서버가 정상 응답하지 않았습니다.");
        }

        return objectMapper.readTree(response.getBody());
    }
}
