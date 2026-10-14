package com.contentpublishing.aiagentservice.controller;

import com.contentpublishing.aiagentservice.agent.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AiAgentController {

    private final DescriptionAgent descriptionAgent;
    private final RelevanceAgent relevanceAgent;
    private final SpellCheckAgent spellCheckAgent;

    // ── Agent 1: Post Description Generation ──

    @PostMapping("/api/ai/description/generate")
    public ResponseEntity<Map<String, Object>> generateDescription(
            @RequestBody Map<String, Object> body) {
        String mood = (String) body.get("mood");
        String mediaType = (String) body.getOrDefault("mediaType", "PHOTO");
        String userText = (String) body.get("userText"); // optional: continue from user-typed text
        @SuppressWarnings("unchecked")
        List<String> categories = (List<String>) body.get("categories");

        String suggested = descriptionAgent.generateDescription(mood, categories, mediaType, userText);
        List<String> options = descriptionAgent.generateDescriptionOptions(mood, categories, mediaType);

        return ResponseEntity.ok(Map.of(
                "suggested", suggested,
                "options", options
        ));
    }

    // ── Agent 1b: Feedback Body Generation (user writing feedback) ──

    @PostMapping("/api/ai/feedback/generate")
    public ResponseEntity<Map<String, Object>> generateFeedbackMessage(
            @RequestBody Map<String, String> body) {
        String subject = body.get("subject");
        String generated = descriptionAgent.generateFeedbackMessage(subject);
        return ResponseEntity.ok(Map.of("message", generated));
    }

    // ── Agent 1c: Admin Reply Generation ──

    @PostMapping("/api/ai/feedback/reply")
    public ResponseEntity<Map<String, Object>> generateAdminReply(
            @RequestBody Map<String, String> body) {
        String subject = body.get("subject");
        String userMessage = body.get("userMessage");
        String reply = descriptionAgent.generateAdminReply(subject, userMessage);
        return ResponseEntity.ok(Map.of("reply", reply));
    }

    // ── Agent 2: Relevance Recommendations ──

    @GetMapping("/api/ai/recommendations/{userId}")
    public ResponseEntity<Map<String, Object>> getRecommendations(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "5") int topN) {
        List<Long> categoryIds = relevanceAgent.getRelevantCategoryIds(userId, topN);
        return ResponseEntity.ok(Map.of("recommendedCategoryIds", categoryIds));
    }

    @PostMapping("/api/ai/behavior/record")
    public ResponseEntity<Map<String, String>> recordBehavior(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, Object> body) {
        Long postId = toLong(body.get("postId"));
        Long categoryId = toLong(body.get("categoryId"));
        String action = (String) body.get("action");
        relevanceAgent.recordInteraction(userId, postId, categoryId, action);
        return ResponseEntity.ok(Map.of("message", "Behavior recorded"));
    }

    // ── Agent 3: Spell Check ──

    @PostMapping("/api/ai/spellcheck")
    public ResponseEntity<Map<String, Object>> spellCheck(@RequestBody Map<String, String> body) {
        String text = body.get("text");
        Map<String, List<String>> suggestions = spellCheckAgent.checkSpelling(text);
        return ResponseEntity.ok(Map.of(
                "text", text != null ? text : "",
                "suggestions", suggestions,
                "hasMistakes", !suggestions.isEmpty()
        ));
    }

    private Long toLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try { return Long.parseLong(obj.toString()); } catch (Exception e) { return null; }
    }
}
