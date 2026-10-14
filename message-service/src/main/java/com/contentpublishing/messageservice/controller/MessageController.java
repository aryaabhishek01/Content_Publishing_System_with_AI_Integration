package com.contentpublishing.messageservice.controller;

import com.contentpublishing.messageservice.entity.Message;
import com.contentpublishing.messageservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping("/api/messages/{receiverId}")
    public ResponseEntity<Message> sendMessage(
            @RequestHeader("X-User-Id") Long senderId,
            @PathVariable Long receiverId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(messageService.sendMessage(senderId, receiverId, body.get("content")));
    }

    @GetMapping("/api/messages/conversation/{otherUserId}")
    public ResponseEntity<List<Message>> getConversation(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long otherUserId) {
        // Mark as read when fetching conversation
        messageService.markAsRead(userId, otherUserId);
        return ResponseEntity.ok(messageService.getConversation(userId, otherUserId));
    }

    @GetMapping("/api/messages/conversations")
    public ResponseEntity<List<Long>> getConversationPartners(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(messageService.getConversationPartners(userId));
    }

    @GetMapping("/api/messages/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(Map.of("unreadCount", messageService.getUnreadCount(userId)));
    }
}
