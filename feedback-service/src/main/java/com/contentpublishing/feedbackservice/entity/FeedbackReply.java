package com.contentpublishing.feedbackservice.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_replies")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FeedbackReply {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "feedback_id", nullable = false)
    private Long feedbackId;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reply;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
