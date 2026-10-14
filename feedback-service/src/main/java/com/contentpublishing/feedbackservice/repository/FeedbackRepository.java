package com.contentpublishing.feedbackservice.repository;

import com.contentpublishing.feedbackservice.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Feedback> findAllByOrderByCreatedAtDesc();
    List<Feedback> findByStatusOrderByCreatedAtDesc(Feedback.Status status);
}
