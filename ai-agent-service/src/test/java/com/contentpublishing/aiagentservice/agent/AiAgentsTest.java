package com.contentpublishing.aiagentservice.agent;

import com.contentpublishing.aiagentservice.entity.UserBehavior;
import com.contentpublishing.aiagentservice.repository.UserBehaviorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiAgentsTest {

    private DescriptionAgent descriptionAgent;
    private SpellCheckAgent spellCheckAgent;
    private RelevanceAgent relevanceAgent;

    @Mock
    private UserBehaviorRepository userBehaviorRepository;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        descriptionAgent = new DescriptionAgent();
        spellCheckAgent = new SpellCheckAgent();
        relevanceAgent = new RelevanceAgent(userBehaviorRepository);
    }

    // ─────────────────────────────────────────────────────────────
    // DESCRIPTION AGENT TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    void testDescriptionAgent_generatesForHappyMood() {
        String desc = descriptionAgent.generateDescription("HAPPY", List.of("Life", "Joy"), "PHOTO");
        assertNotNull(desc);
        assertTrue(desc.length() > 0);
        assertTrue(desc.contains("#life"));
        assertTrue(desc.contains("#joy"));
    }

    @Test
    void testDescriptionAgent_returnsOptions() {
        List<String> options = descriptionAgent.generateDescriptionOptions("SPORTS", List.of("Cricket"), "VIDEO");
        assertNotNull(options);
        assertFalse(options.isEmpty());
        assertTrue(options.get(0).contains("#cricket"));
    }

    // ─────────────────────────────────────────────────────────────
    // SPELL CHECK AGENT TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    void testSpellCheckAgent_detectsMisspelling() {
        // "happi" is not in dictionary, "happy" is
        Map<String, List<String>> suggestions = spellCheckAgent.checkSpelling("Feeling so happi today");
        assertTrue(suggestions.containsKey("happi"));
        List<String> words = suggestions.get("happi");
        assertTrue(words.contains("happy"));
    }

    @Test
    void testSpellCheckAgent_noSuggestionsForCorrectWords() {
        Map<String, List<String>> suggestions = spellCheckAgent.checkSpelling("life is beautiful and amazing");
        assertTrue(suggestions.isEmpty());
    }

    // ─────────────────────────────────────────────────────────────
    // RELEVANCE AGENT TESTS
    // ─────────────────────────────────────────────────────────────

    @Test
    void testRelevanceAgent_ranksCategoriesByInteractionWeight() {
        Long userId = 100L;
        // User viewed category 1 twice (weight 1.0 * 2 = 2.0)
        // User liked category 2 once (weight 3.0)
        // User commented category 3 once (weight 4.0)
        List<UserBehavior> behaviors = List.of(
                UserBehavior.builder().userId(userId).categoryId(1L).action(UserBehavior.Action.VIEW).build(),
                UserBehavior.builder().userId(userId).categoryId(1L).action(UserBehavior.Action.VIEW).build(),
                UserBehavior.builder().userId(userId).categoryId(2L).action(UserBehavior.Action.LIKE).build(),
                UserBehavior.builder().userId(userId).categoryId(3L).action(UserBehavior.Action.COMMENT).build()
        );

        when(userBehaviorRepository.findByUserId(userId)).thenReturn(behaviors);

        List<Long> ranked = relevanceAgent.getRelevantCategoryIds(userId, 3);
        assertEquals(3, ranked.size());
        // Rank 1: Category 3 (score 4.0)
        assertEquals(3L, ranked.get(0));
        // Rank 2: Category 2 (score 3.0)
        assertEquals(2L, ranked.get(1));
        // Rank 3: Category 1 (score 2.0)
        assertEquals(1L, ranked.get(2));
    }
}
