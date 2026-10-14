package com.contentpublishing.messageservice.service;

import com.contentpublishing.messageservice.entity.Message;
import com.contentpublishing.messageservice.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private static final Logger logger = LoggerFactory.getLogger(MessageService.class);

    private final MessageRepository messageRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Send a message — only between mutual followers (enforced at controller level via header check).
     */
    @Transactional
    public Message sendMessage(Long senderId, Long receiverId, String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content cannot be empty");
        }

        Message message = Message.builder()
                .senderId(senderId)
                .receiverId(receiverId)
                .content(content)
                .isRead(false)
                .build();

        Message saved = messageRepository.save(message);
        logger.info("Message sent from {} to {}", senderId, receiverId);

        // Store notification for receiver
        try {
            String senderName = null;
            try {
                senderName = jdbcTemplate.queryForObject("SELECT name FROM users WHERE id = ?", String.class, senderId);
            } catch (Exception ignored) {}

            String notifContent = (senderName != null && !senderName.isBlank() ? senderName : "Someone") + " sent you a message";
            jdbcTemplate.update(
                "INSERT INTO notifications (user_id, actor_id, type, reference_id, content, is_read, created_at) VALUES (?, ?, 'MESSAGE', ?, ?, 0, NOW())",
                receiverId, senderId, saved.getId(), notifContent
            );
        } catch (Exception e) {
            logger.warn("Could not insert message notification: {}", e.getMessage());
        }

        return saved;
    }

    public List<Message> getConversation(Long userId1, Long userId2) {
        return messageRepository.findConversation(userId1, userId2);
    }

    public List<Long> getConversationPartners(Long userId) {
        return messageRepository.findConversationPartnerIds(userId);
    }

    @Transactional
    public void markAsRead(Long receiverId, Long senderId) {
        messageRepository.markAsRead(receiverId, senderId);
    }

    public long getUnreadCount(Long userId) {
        return messageRepository.countByReceiverIdAndIsReadFalse(userId);
    }
}
