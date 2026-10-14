package com.contentpublishing.followservice.service;

import com.contentpublishing.followservice.entity.Follow;
import com.contentpublishing.followservice.repository.FollowRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FollowService {

    private static final Logger logger = LoggerFactory.getLogger(FollowService.class);

    private final FollowRepository followRepository;
    private final RabbitTemplate rabbitTemplate;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public Map<String, Object> toggleFollow(Long followerId, Long followingId) {
        if (followerId.equals(followingId)) {
            throw new IllegalArgumentException("Cannot follow yourself");
        }

        Optional<Follow> existing = followRepository.findByFollowerIdAndFollowingId(followerId, followingId);
        boolean following;

        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            following = false;
            logger.info("User {} unfollowed user {}", followerId, followingId);
        } else {
            Follow follow = Follow.builder()
                    .followerId(followerId)
                    .followingId(followingId)
                    .build();
            followRepository.save(follow);
            following = true;
            logger.info("User {} followed user {}", followerId, followingId);

            // Resilient notification
            sendNotification(followingId, followerId, "FOLLOW", followerId, "started following you");
        }

        return Map.of(
                "following", following,
                "followerCount", followRepository.countByFollowingId(followingId),
                "followingCount", followRepository.countByFollowerId(followerId)
        );
    }

    public List<Long> getFollowingIds(Long userId) {
        return followRepository.findFollowingIds(userId);
    }

    public List<Long> getFollowerIds(Long userId) {
        return followRepository.findFollowerIds(userId);
    }

    public boolean isFollowing(Long followerId, Long followingId) {
        return followRepository.findByFollowerIdAndFollowingId(followerId, followingId).isPresent();
    }

    public Map<String, Long> getCounts(Long userId) {
        long followerCount = followRepository.countByFollowingId(userId);
        long followingCount = followRepository.countByFollowerId(userId);
        return Map.of("followerCount", followerCount, "followingCount", followingCount);
    }

    public boolean areMutualFollowers(Long userId1, Long userId2) {
        boolean u1FollowsU2 = followRepository.findByFollowerIdAndFollowingId(userId1, userId2).isPresent();
        boolean u2FollowsU1 = followRepository.findByFollowerIdAndFollowingId(userId2, userId1).isPresent();
        return u1FollowsU2 && u2FollowsU1;
    }

    @Transactional
    public Map<String, Object> removeFollower(Long currentUserId, Long followerId) {
        Optional<Follow> existing = followRepository.findByFollowerIdAndFollowingId(followerId, currentUserId);
        boolean removed = false;
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            removed = true;
            logger.info("User {} removed follower {}", currentUserId, followerId);
        }
        return Map.of(
                "removed", removed,
                "followerCount", followRepository.countByFollowingId(currentUserId),
                "followingCount", followRepository.countByFollowerId(currentUserId)
        );
    }

    @Transactional
    public Map<String, Object> unfollow(Long followerId, Long followingId) {
        Optional<Follow> existing = followRepository.findByFollowerIdAndFollowingId(followerId, followingId);
        if (existing.isPresent()) {
            followRepository.delete(existing.get());
            logger.info("User {} unfollowed user {}", followerId, followingId);
        }
        return Map.of(
                "following", false,
                "followerCount", followRepository.countByFollowingId(followingId),
                "followingCount", followRepository.countByFollowerId(followerId)
        );
    }

    private void sendNotification(Long targetUserId, Long actorId, String type, Long referenceId, String actionText) {
        if (targetUserId == null || actorId == null || targetUserId.equals(actorId)) return;

        // 1. Try RabbitMQ first
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", type);
            event.put("postId", referenceId);
            event.put("actorId", actorId);
            event.put("targetUserId", targetUserId);
            rabbitTemplate.convertAndSend("notification.exchange", "notification.key", event);
        } catch (Exception e) {
            logger.debug("RabbitMQ unavailable for follow notification: {}", e.getMessage());
        }

        // 2. Direct DB fallback (guarantees delivery if RabbitMQ is offline)
        try {
            String actorName = null;
            try {
                actorName = jdbcTemplate.queryForObject("SELECT name FROM users WHERE id = ?", String.class, actorId);
            } catch (Exception ignored) {}

            String content = (actorName != null && !actorName.isBlank() ? actorName : "Someone") + " " + actionText;
            jdbcTemplate.update(
                "INSERT INTO notifications (user_id, actor_id, type, reference_id, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())",
                targetUserId, actorId, type, referenceId, content
            );
            logger.info("Follow notification saved directly in DB for user {} type {}", targetUserId, type);
        } catch (Exception ex) {
            logger.error("Failed to insert follow notification into DB: {}", ex.getMessage());
        }
    }
}
