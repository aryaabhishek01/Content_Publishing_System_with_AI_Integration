package com.contentpublishing.aiagentservice.agent;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Agent 3: Spell-Check Agent
 * Provides spelling correction suggestions for user-typed text.
 * Uses a built-in dictionary with Levenshtein distance for fuzzy matching.
 */
@Service
public class SpellCheckAgent {

    // Comprehensive common-word dictionary
    private static final Set<String> DICTIONARY = new HashSet<>(Arrays.asList(
        "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
        "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
        "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
        "an", "will", "my", "one", "all", "would", "there", "their", "what",
        "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
        "when", "make", "can", "like", "time", "no", "just", "him", "know",
        "take", "people", "into", "year", "your", "good", "some", "could",
        "them", "see", "other", "than", "then", "now", "look", "only", "come",
        "its", "over", "think", "also", "back", "after", "use", "two", "how",
        "our", "work", "first", "well", "way", "even", "new", "want", "because",
        "any", "these", "give", "day", "most", "us", "great", "between", "need",
        "large", "often", "hand", "high", "place", "hold", "turn", "life", "few",
        "north", "open", "seem", "together", "next", "white", "children", "begin",
        "happy", "sad", "excited", "beautiful", "amazing", "wonderful", "incredible",
        "fantastic", "awesome", "terrible", "horrible", "interesting", "important",
        "sharing", "posting", "following", "comment", "like", "photo", "video",
        "moment", "memory", "friend", "family", "sport", "cricket", "travel",
        "food", "music", "technology", "politics", "today", "yesterday", "tomorrow",
        "morning", "evening", "night", "weekend", "holiday", "birthday", "love",
        "heart", "smile", "laugh", "enjoy", "celebrate", "congratulations"
    ));

    /**
     * Check text and return suggestions for potentially misspelled words.
     */
    public Map<String, List<String>> checkSpelling(String text) {
        Map<String, List<String>> suggestions = new LinkedHashMap<>();

        if (text == null || text.isBlank()) return suggestions;

        String[] words = text.split("\\s+");
        for (String rawWord : words) {
            String word = rawWord.replaceAll("[^a-zA-Z]", "").toLowerCase();
            if (word.length() < 3) continue;

            if (!DICTIONARY.contains(word)) {
                List<String> wordSuggestions = findSuggestions(word);
                if (!wordSuggestions.isEmpty()) {
                    suggestions.put(rawWord, wordSuggestions);
                }
            }
        }

        return suggestions;
    }

    /**
     * Find closest dictionary words using Levenshtein distance.
     */
    private List<String> findSuggestions(String word) {
        return DICTIONARY.stream()
                .filter(dictWord -> Math.abs(dictWord.length() - word.length()) <= 2)
                .map(dictWord -> new AbstractMap.SimpleEntry<>(dictWord, levenshtein(word, dictWord)))
                .filter(entry -> entry.getValue() <= 2)
                .sorted(Map.Entry.comparingByValue())
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();
    }

    /**
     * Levenshtein edit distance algorithm.
     */
    private int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];

        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }

        return dp[a.length()][b.length()];
    }
}
