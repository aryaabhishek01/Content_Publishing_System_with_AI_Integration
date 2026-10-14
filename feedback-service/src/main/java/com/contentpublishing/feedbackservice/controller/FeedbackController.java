package com.contentpublishing.feedbackservice.controller;

import com.contentpublishing.feedbackservice.entity.*;
import com.contentpublishing.feedbackservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;
    private final FeedbackReplyRepository replyRepository;

    // ── User submits feedback ──
    @PostMapping("/api/feedback")
    public ResponseEntity<Feedback> submitFeedback(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        if (body.get("message") == null || body.get("message").isBlank()) {
            throw new IllegalArgumentException("Feedback message cannot be empty");
        }
        Feedback feedback = Feedback.builder()
                .userId(userId)
                .subject(body.get("subject"))
                .message(body.get("message"))
                .status(Feedback.Status.PENDING)
                .build();
        return ResponseEntity.ok(feedbackRepository.save(feedback));
    }

    // ── User views their own feedback ──
    @GetMapping("/api/feedback/my")
    public ResponseEntity<List<Feedback>> getMyFeedback(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    // ── Admin: get all feedback ──
    @GetMapping("/api/feedback/all")
    public ResponseEntity<List<Feedback>> getAllFeedback() {
        return ResponseEntity.ok(feedbackRepository.findAllByOrderByCreatedAtDesc());
    }

    // ── Admin: reply to feedback ──
    @PostMapping("/api/feedback/{feedbackId}/reply")
    public ResponseEntity<FeedbackReply> replyToFeedback(
            @PathVariable Long feedbackId,
            @RequestHeader("X-User-Id") Long adminId,
            @RequestBody Map<String, String> body) {

        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new IllegalArgumentException("Feedback not found"));

        FeedbackReply reply = FeedbackReply.builder()
                .feedbackId(feedbackId)
                .adminId(adminId)
                .reply(body.get("reply"))
                .build();
        FeedbackReply saved = replyRepository.save(reply);

        // Update feedback status
        feedback.setStatus(Feedback.Status.REPLIED);
        feedbackRepository.save(feedback);

        return ResponseEntity.ok(saved);
    }

    // ── Get replies for a feedback ──
    @GetMapping("/api/feedback/{feedbackId}/replies")
    public ResponseEntity<List<FeedbackReply>> getReplies(@PathVariable Long feedbackId) {
        return ResponseEntity.ok(replyRepository.findByFeedbackIdOrderByCreatedAtAsc(feedbackId));
    }
}
