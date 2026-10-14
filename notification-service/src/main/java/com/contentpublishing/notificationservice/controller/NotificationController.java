package com.contentpublishing.notificationservice.controller;

import com.contentpublishing.notificationservice.entity.Notification;
import com.contentpublishing.notificationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/api/notifications")
    public ResponseEntity<List<Notification>> getAll(@RequestHeader("X-User-Id") Long userId) {
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        enrichNotifications(list);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/api/notifications/unread")
    public ResponseEntity<List<Notification>> getUnread(@RequestHeader("X-User-Id") Long userId) {
        List<Notification> list = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        enrichNotifications(list);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/api/notifications/count")
    public ResponseEntity<Map<String, Long>> getCount(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(Map.of("count", notificationRepository.countByUserIdAndIsReadFalse(userId)));
    }

    @PostMapping("/api/notifications/mark-read")
    public ResponseEntity<Map<String, String>> markAllRead(@RequestHeader("X-User-Id") Long userId) {
        notificationRepository.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @PostMapping("/api/notifications/create")
    public ResponseEntity<Notification> createNotification(@RequestBody Map<String, Object> body) {
        Long targetUserId = toLong(body.get("userId"));
        Long actorId = toLong(body.get("actorId"));
        String typeStr = (String) body.get("type");
        Long referenceId = toLong(body.get("referenceId"));
        String content = (String) body.get("content");

        if (targetUserId == null || actorId == null || typeStr == null) {
            return ResponseEntity.badRequest().build();
        }

        Notification.NotificationType type = Notification.NotificationType.valueOf(typeStr.toUpperCase());
        Notification notification = Notification.builder()
                .userId(targetUserId)
                .actorId(actorId)
                .type(type)
                .referenceId(referenceId)
                .content(content)
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        enrichNotifications(List.of(saved));
        return ResponseEntity.ok(saved);
    }

    private void enrichNotifications(List<Notification> list) {
        if (list == null || list.isEmpty()) return;
        List<Long> actorIds = list.stream()
                .map(Notification::getActorId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (actorIds.isEmpty()) return;

        String inSql = String.join(",", Collections.nCopies(actorIds.size(), "?"));
        String sql = "SELECT id, name, username, profile_picture FROM users WHERE id IN (" + inSql + ")";

        Map<Long, Map<String, Object>> userMap = new HashMap<>();
        try {
            jdbcTemplate.query(sql, actorIds.toArray(), rs -> {
                Long id = rs.getLong("id");
                Map<String, Object> u = new HashMap<>();
                u.put("name", rs.getString("name"));
                u.put("username", rs.getString("username"));
                u.put("profilePicture", rs.getString("profile_picture"));
                userMap.put(id, u);
            });

            for (Notification n : list) {
                Map<String, Object> u = userMap.get(n.getActorId());
                if (u != null) {
                    n.setActorName((String) u.get("name"));
                    n.setActorUsername((String) u.get("username"));
                    n.setActorProfilePicture((String) u.get("profilePicture"));
                }
            }
        } catch (Exception ignored) {}
    }

    private Long toLong(Object val) {
        if (val == null) return null;
        if (val instanceof Number) return ((Number) val).longValue();
        try {
            return Long.parseLong(val.toString());
        } catch (Exception e) {
            return null;
        }
    }
}
