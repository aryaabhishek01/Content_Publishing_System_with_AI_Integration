package com.contentpublishing.notificationservice.consumer;

import com.contentpublishing.notificationservice.entity.Notification;
import com.contentpublishing.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationConsumer {

    private static final Logger logger = LoggerFactory.getLogger(NotificationConsumer.class);

    private final NotificationRepository notificationRepository;

    @RabbitListener(queues = "notification.queue")
    public void consumeNotification(Map<String, Object> event) {
        try {
            String type = (String) event.get("type");
            Long actorId = toLong(event.get("actorId"));
            Long targetUserId = toLong(event.get("targetUserId"));

            if (targetUserId == null || actorId == null) return;

            // Do not notify yourself
            if (actorId.equals(targetUserId)) return;

            Notification.NotificationType notifType = switch (type) {
                case "LIKE" -> Notification.NotificationType.LIKE;
                case "COMMENT" -> Notification.NotificationType.COMMENT;
                case "FOLLOW" -> Notification.NotificationType.FOLLOW;
                default -> null;
            };

            if (notifType == null) return;

            Long referenceId = toLong(event.get("postId"));

            String content = switch (notifType) {
                case LIKE -> "Someone liked your post";
                case COMMENT -> "Someone commented on your post";
                case FOLLOW -> "Someone started following you";
                case MESSAGE -> "You have a new message";
            };

            Notification notification = Notification.builder()
                    .userId(targetUserId)
                    .actorId(actorId)
                    .type(notifType)
                    .referenceId(referenceId)
                    .content(content)
                    .isRead(false)
                    .build();

            notificationRepository.save(notification);
            logger.info("Notification created for user: {} type: {}", targetUserId, notifType);
        } catch (Exception e) {
            logger.error("Error processing notification: {}", e.getMessage());
        }
    }

    private Long toLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try { return Long.parseLong(obj.toString()); } catch (Exception e) { return null; }
    }
}
