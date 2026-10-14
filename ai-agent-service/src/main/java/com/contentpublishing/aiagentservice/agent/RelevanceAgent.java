package com.contentpublishing.aiagentservice.agent;

import com.contentpublishing.aiagentservice.entity.UserBehavior;
import com.contentpublishing.aiagentservice.repository.UserBehaviorRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Agent 2: Relevance Agent
 * Analyzes user viewing behavior to recommend relevant post categories.
 * Tracks views, likes, and comments to build a preference profile.
 */
@Service
@RequiredArgsConstructor
public class RelevanceAgent {

    private static final Logger logger = LoggerFactory.getLogger(RelevanceAgent.class);

    private final UserBehaviorRepository userBehaviorRepository;

    /**
     * Get ranked category IDs for a user based on their behavior.
     * Returns most engaged categories first.
     */
    public List<Long> getRelevantCategoryIds(Long userId, int topN) {
        List<UserBehavior> behaviors = userBehaviorRepository.findByUserId(userId);

        if (behaviors.isEmpty()) {
            logger.info("No behavior data for user: {} — returning empty recommendations", userId);
            return Collections.emptyList();
        }

        // Score each category by action weight
        Map<Long, Double> categoryScores = new HashMap<>();

        for (UserBehavior behavior : behaviors) {
            if (behavior.getCategoryId() == null) continue;

            double weight = switch (behavior.getAction()) {
                case VIEW -> 1.0;
                case LIKE -> 3.0;
                case COMMENT -> 4.0;
                case SHARE -> 5.0;
            };

            categoryScores.merge(behavior.getCategoryId(), weight, Double::sum);
        }

        // Sort categories by score descending and take top N
        return categoryScores.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .limit(topN)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    /**
     * Record user interaction with a post's category for future recommendations.
     */
    public void recordInteraction(Long userId, Long postId, Long categoryId, String action) {
        try {
            UserBehavior behavior = UserBehavior.builder()
                    .userId(userId)
                    .postId(postId)
                    .categoryId(categoryId)
                    .action(UserBehavior.Action.valueOf(action.toUpperCase()))
                    .build();
            userBehaviorRepository.save(behavior);
            logger.debug("Recorded {} interaction for user: {} on category: {}", action, userId, categoryId);
        } catch (Exception e) {
            logger.warn("Failed to record interaction: {}", e.getMessage());
        }
    }
}
