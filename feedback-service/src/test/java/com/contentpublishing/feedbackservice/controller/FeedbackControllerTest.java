package com.contentpublishing.feedbackservice.controller;

import com.contentpublishing.feedbackservice.entity.Feedback;
import com.contentpublishing.feedbackservice.entity.FeedbackReply;
import com.contentpublishing.feedbackservice.repository.FeedbackReplyRepository;
import com.contentpublishing.feedbackservice.repository.FeedbackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FeedbackControllerTest {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private FeedbackReplyRepository replyRepository;

    @InjectMocks
    private FeedbackController feedbackController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testSubmitFeedback_success() {
        Feedback feedback = Feedback.builder()
                .id(1L)
                .userId(10L)
                .subject("Bug Report")
                .message("There is an issue on the profile page")
                .status(Feedback.Status.PENDING)
                .build();

        when(feedbackRepository.save(any(Feedback.class))).thenReturn(feedback);

        ResponseEntity<Feedback> response = feedbackController.submitFeedback(10L, Map.of(
                "subject", "Bug Report",
                "message", "There is an issue on the profile page"
        ));

        assertNotNull(response.getBody());
        assertEquals("Bug Report", response.getBody().getSubject());
        assertEquals(Feedback.Status.PENDING, response.getBody().getStatus());
        verify(feedbackRepository, times(1)).save(any(Feedback.class));
    }

    @Test
    void testSubmitFeedback_emptyMessage_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
                feedbackController.submitFeedback(10L, Map.of("subject", "Subject", "message", ""))
        );
    }

    @Test
    void testReplyToFeedback_updatesStatusToReplied() {
        Long feedbackId = 5L;
        Long adminId = 1L;

        Feedback feedback = Feedback.builder()
                .id(feedbackId)
                .userId(10L)
                .subject("Question")
                .message("How do I edit my post?")
                .status(Feedback.Status.PENDING)
                .build();

        FeedbackReply reply = FeedbackReply.builder()
                .id(20L)
                .feedbackId(feedbackId)
                .adminId(adminId)
                .reply("Click on the three dots at the top right of your post.")
                .build();

        when(feedbackRepository.findById(feedbackId)).thenReturn(Optional.of(feedback));
        when(replyRepository.save(any(FeedbackReply.class))).thenReturn(reply);
        when(feedbackRepository.save(any(Feedback.class))).thenReturn(feedback);

        ResponseEntity<FeedbackReply> response = feedbackController.replyToFeedback(
                feedbackId, adminId, Map.of("reply", "Click on the three dots at the top right of your post.")
        );

        assertNotNull(response.getBody());
        assertEquals(20L, response.getBody().getId());
        assertEquals(Feedback.Status.REPLIED, feedback.getStatus());
        verify(replyRepository, times(1)).save(any(FeedbackReply.class));
        verify(feedbackRepository, times(1)).save(feedback);
    }

    @Test
    void testGetReplies_returnsList() {
        Long feedbackId = 5L;
        FeedbackReply reply = FeedbackReply.builder().id(1L).feedbackId(feedbackId).reply("Reply text").build();
        when(replyRepository.findByFeedbackIdOrderByCreatedAtAsc(feedbackId)).thenReturn(List.of(reply));

        ResponseEntity<List<FeedbackReply>> response = feedbackController.getReplies(feedbackId);
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
    }
}
