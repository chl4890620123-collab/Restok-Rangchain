package com.ai.project.controller;

import com.ai.project.service.AiGatewayService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiGatewayController {

    private final AiGatewayService aiGatewayService;

    @PostMapping(value = "/analyze-receipt", consumes = "multipart/form-data")
    public ResponseEntity<?> analyzeReceipt(@RequestPart("file") MultipartFile file) {
        try {
            JsonNode result = aiGatewayService.analyzeReceipt(file);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(new ErrorResponse("AI 분석 서버와 통신하지 못했습니다."));
        }
    }

    private record ErrorResponse(String message) {}
}
