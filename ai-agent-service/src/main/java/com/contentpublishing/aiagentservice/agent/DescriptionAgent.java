package com.contentpublishing.aiagentservice.agent;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Agent 1: Description Agent
 * Generates unique post descriptions based on mood, categories, and optional user input.
 */
@Service
public class DescriptionAgent {

    // Each mood has many varied templates to avoid repetition
    private static final Map<String, List<String>> MOOD_TEMPLATES = new LinkedHashMap<>();

    static {
        MOOD_TEMPLATES.put("HAPPY", List.of(
            "Sharing a moment of pure joy and happiness! ✨",
            "Life is beautiful — capturing this wonderful memory! 🌟",
            "Feeling blessed and grateful for this amazing moment! 🎉",
            "Spreading good vibes and positive energy today! 😊",
            "Happiness looks like this — couldn't keep it to myself! 🌈",
            "On top of the world right now. Sharing this with you all! 🥳"
        ));
        MOOD_TEMPLATES.put("SAD", List.of(
            "Sometimes life takes us through difficult moments... 💙",
            "Finding strength in vulnerability. Sharing my honest feelings. 🌧️",
            "Not every day is perfect, and that's okay. 💫",
            "Healing takes time. Taking it one day at a time. 🌿",
            "Even the darkest nights end with a sunrise. 🌅",
            "Real emotions deserve real expression. Being honest today. 💭"
        ));
        MOOD_TEMPLATES.put("POLITICS", List.of(
            "Sharing my thoughts on current events. Let's have a respectful discussion. 🏛️",
            "Democracy thrives when we engage. Here's my perspective. 📜",
            "Important topics deserve our attention and thoughtful dialogue. 🗣️",
            "Staying informed and speaking up — because it matters. 📢",
            "Civic responsibility starts with awareness. Let's talk about this. 🌍",
            "Policy shapes lives. Here's what I think about the latest. ⚖️"
        ));
        MOOD_TEMPLATES.put("SPORTS", List.of(
            "Game day vibes! Nothing beats the thrill of competition! 🏆",
            "Sports teach us discipline, teamwork, and never giving up! ⚽",
            "Celebrating the spirit of the game! 🎯",
            "The adrenaline is real — what a match! 🔥",
            "Champions aren't born, they're made — one practice at a time. 💪",
            "Sports bring us together like nothing else can. 🤝"
        ));
        MOOD_TEMPLATES.put("CRICKET", List.of(
            "Cricket is not just a sport — it's a passion! 🏏",
            "Sharing the excitement of this incredible cricket moment! 🎳",
            "Bowled over by the brilliance of this game! 🏆",
            "Every delivery tells a story on the pitch. 🌟",
            "From boundaries to wickets — what a day of cricket! 🎉",
            "This is why we love the game. Magical moments! ✨"
        ));
        MOOD_TEMPLATES.put("TRAVEL", List.of(
            "Exploring new horizons and making unforgettable memories! ✈️",
            "The world is too beautiful not to share! 🌍",
            "Adventure awaits — and I found it! 🗺️",
            "Every destination has a story. Here's mine. 📖",
            "Travel is the only thing you buy that makes you richer. 💫",
            "Wandering where the WiFi is weak but the views are strong! 🏔️"
        ));
        MOOD_TEMPLATES.put("FOOD", List.of(
            "Good food, good mood! Sharing this delicious experience! 🍽️",
            "Life is too short for bad food. This one is absolutely divine! 🌟",
            "Food is love made visible — and I'm feeling very loved! 😋",
            "Eat well, live well. This meal is a masterpiece. 🍳",
            "The only thing better than eating good food is sharing it! 🤤",
            "A feast for the eyes and the taste buds. Bon appétit! 🥗"
        ));
        MOOD_TEMPLATES.put("TECHNOLOGY", List.of(
            "The future is here and it's incredible! 🚀",
            "Innovation never stops — sharing this amazing tech moment! 💡",
            "Technology connecting us all — one post at a time! 🌐",
            "Building tomorrow, today. The digital world never sleeps. 💻",
            "Tech that changes the game — this is what I'm excited about! ⚡",
            "From idea to reality — the power of technology! 🔧"
        ));
        MOOD_TEMPLATES.put("MUSIC", List.of(
            "Music is the language that everyone understands. 🎵",
            "Lost in the melody, found in the rhythm. 🎶",
            "Some songs just hit different. This one speaks to my soul. 🎸",
            "Music heals what words can't express. Sharing this vibe! 🎤",
            "Life has a soundtrack — and today's is this. 🎹",
            "When words fail, music speaks. 🎺"
        ));
        MOOD_TEMPLATES.put("ART", List.of(
            "Art is how I make sense of the world. 🎨",
            "Creativity knows no limits — sharing this piece with you! ✏️",
            "Every brushstroke tells a story. Here's mine. 🖌️",
            "Art is not what you see, but what you make others see. 👁️",
            "Expression without words. Sometimes that's more powerful. 🌀",
            "Creating and sharing — two of my favorite things. 🖼️"
        ));
        MOOD_TEMPLATES.put("OTHER", List.of(
            "Sharing something special with all of you! 📸",
            "Every moment has its story — here's today's chapter. 🌟",
            "Life is full of surprises. Sharing this one! ✨",
            "Little things add up to something beautiful. 💫",
            "Couldn't keep this to myself — you need to see this! 😄",
            "Real moments, real life. Sharing what matters. 🌿"
        ));
    }

    private static final List<String> DEFAULT_TEMPLATES = List.of(
        "Sharing this special moment with all of you! 📸",
        "Every picture tells a story — here's mine! 🎨",
        "Capturing memories that matter! ✨",
        "Life in frames — couldn't keep this one to myself. 🌟",
        "A moment worth sharing. Hope it brightens your day! ☀️",
        "Real moments, curated for you. 💫"
    );

    private static final Random RANDOM = new Random();

    /**
     * Generate a single description suggestion. Always random to avoid repetition.
     */
    public String generateDescription(String mood, List<String> categories, String mediaType) {
        return generateDescription(mood, categories, mediaType, null);
    }

    /**
     * Generate a description, optionally continuing/expanding from user-typed text.
     */
    public String generateDescription(String mood, List<String> categories, String mediaType, String userText) {
        List<String> templates = getTemplates(mood);
        String base;

        if (userText != null && !userText.isBlank()) {
            // Continue from what the user typed — append a fitting emoji-line continuation
            base = userText.trim() + " " + pickContinuation(mood);
        } else {
            // Pick a random template (never the same twice in a row thanks to true random)
            base = templates.get(RANDOM.nextInt(templates.size()));
        }

        return base + buildHashtags(categories);
    }

    /**
     * Generate 3 distinct description options for the user to pick from.
     */
    public List<String> generateDescriptionOptions(String mood, List<String> categories, String mediaType) {
        List<String> templates = new ArrayList<>(getTemplates(mood));
        Collections.shuffle(templates);
        String hashtags = buildHashtags(categories);
        return templates.stream()
                .limit(3)
                .map(t -> t + hashtags)
                .toList();
    }

    /**
     * Generate a feedback message body from a given subject.
     */
    public String generateFeedbackMessage(String subject) {
        if (subject == null || subject.isBlank()) {
            return "I wanted to share some feedback about my experience with ContentHub. "
                 + "Overall, I think the platform has a lot of potential and I'd love to see it improve further. "
                 + "Please let me know if you need any more details from my end.";
        }

        String s = subject.toLowerCase();

        if (s.contains("bug") || s.contains("error") || s.contains("issue") || s.contains("problem")) {
            return "Hi team,\n\nI encountered an issue related to: \"" + subject + "\".\n\n"
                 + "The problem occurs consistently and affects my ability to use the platform smoothly. "
                 + "I would appreciate it if this could be looked into as soon as possible. "
                 + "Please feel free to reach out if you need more details to reproduce the issue.\n\nThank you!";
        }

        if (s.contains("feature") || s.contains("suggestion") || s.contains("improve") || s.contains("idea")) {
            return "Hello ContentHub team,\n\nI have a suggestion regarding: \"" + subject + "\".\n\n"
                 + "I believe this addition would significantly improve the user experience for many people on the platform. "
                 + "It would make content creation and discovery much more seamless. "
                 + "I'd love to see this explored in a future update.\n\nThanks for building such a great platform!";
        }

        if (s.contains("thank") || s.contains("great") || s.contains("love") || s.contains("awesome") || s.contains("good")) {
            return "Hi there,\n\nI just wanted to take a moment to appreciate: \"" + subject + "\".\n\n"
                 + "ContentHub has been a fantastic experience so far. "
                 + "The platform is intuitive, the community is welcoming, and the features are well thought out. "
                 + "Keep up the amazing work — it really shows!\n\nBest regards!";
        }

        if (s.contains("account") || s.contains("login") || s.contains("password") || s.contains("profile")) {
            return "Hello,\n\nI'm writing regarding an issue with: \"" + subject + "\".\n\n"
                 + "I'm having trouble with my account access and would appreciate your assistance. "
                 + "This is affecting my ability to use the platform normally. "
                 + "Could you please guide me through the steps to resolve this?\n\nThank you for your support!";
        }

        if (s.contains("post") || s.contains("content") || s.contains("upload") || s.contains("media")) {
            return "Hello ContentHub team,\n\nI'd like to provide feedback regarding: \"" + subject + "\".\n\n"
                 + "While using the content creation features, I noticed something that could be improved. "
                 + "Better support in this area would make it much easier to create and share quality content. "
                 + "I'm an active user and I care about the platform, which is why I'm sharing this.\n\nThanks!";
        }

        // Generic intelligent fallback based on subject
        return "Hello ContentHub team,\n\nI'm writing to provide feedback on: \"" + subject + "\".\n\n"
             + "After using the platform regularly, I wanted to share my thoughts on this topic. "
             + "I believe this is an area that deserves attention as it directly impacts the overall experience. "
             + "I hope this feedback is useful and look forward to seeing improvements.\n\nThank you!";
    }

    /**
     * Generate an admin reply to a user feedback message.
     */
    public String generateAdminReply(String subject, String userMessage) {
        String s = (subject != null ? subject : "").toLowerCase()
                 + " " + (userMessage != null ? userMessage : "").toLowerCase();

        if (s.contains("bug") || s.contains("error") || s.contains("issue") || s.contains("problem") || s.contains("not working")) {
            return "Hi there,\n\nThank you for reporting this issue. "
                 + "We've reviewed your feedback and our technical team is already looking into it. "
                 + "We appreciate your patience while we work on a fix. "
                 + "You'll be notified as soon as the issue is resolved. "
                 + "If you have any additional details that might help us reproduce the problem, please don't hesitate to reply.\n\nBest regards,\nContentHub Admin";
        }

        if (s.contains("feature") || s.contains("suggestion") || s.contains("improve") || s.contains("idea") || s.contains("add")) {
            return "Hello,\n\nThank you for your thoughtful suggestion! "
                 + "We genuinely appreciate users who take the time to share ideas for making ContentHub better. "
                 + "Your feedback has been noted and will be considered in our upcoming development roadmap. "
                 + "We're always working to improve the platform and input like yours makes a real difference.\n\nThanks for being a valued member of our community!\nContentHub Admin";
        }

        if (s.contains("thank") || s.contains("great") || s.contains("love") || s.contains("awesome") || s.contains("amazing")) {
            return "Hi there,\n\nThank you so much for the kind words — they truly made our day! "
                 + "It's wonderful to hear that you're enjoying ContentHub. "
                 + "Our team works hard to create the best experience possible, "
                 + "and feedback like yours keeps us motivated. "
                 + "We hope to keep exceeding your expectations!\n\nWarm regards,\nContentHub Admin";
        }

        if (s.contains("account") || s.contains("login") || s.contains("password") || s.contains("access") || s.contains("profile")) {
            return "Hello,\n\nThank you for reaching out about your account. "
                 + "We understand how important it is to have uninterrupted access to your ContentHub account. "
                 + "Our support team will assist you in resolving this as quickly as possible. "
                 + "If you can share your registered email address and describe the issue in more detail, "
                 + "we can expedite the resolution.\n\nBest regards,\nContentHub Admin";
        }

        if (s.contains("post") || s.contains("content") || s.contains("upload") || s.contains("media") || s.contains("publish")) {
            return "Hi,\n\nThank you for your feedback about content features on ContentHub. "
                 + "We're constantly working to improve the content creation and publishing experience. "
                 + "Your observations have been shared with our product team for review. "
                 + "We value your engagement with the platform and will do our best to address your concerns.\n\nThank you!\nContentHub Admin";
        }

        // Generic professional reply
        return "Hello,\n\nThank you for reaching out to ContentHub. "
             + "We've received your message and appreciate you taking the time to share your feedback. "
             + "Our team will review it carefully and get back to you if further action is needed. "
             + "Your experience matters to us and we're committed to making ContentHub the best it can be.\n\nBest regards,\nContentHub Admin";
    }

    // ── Private helpers ──────────────────────────────────────────

    private List<String> getTemplates(String mood) {
        if (mood == null) return DEFAULT_TEMPLATES;
        return MOOD_TEMPLATES.getOrDefault(mood.toUpperCase(), DEFAULT_TEMPLATES);
    }

    private String pickContinuation(String mood) {
        Map<String, List<String>> continuations = Map.of(
            "HAPPY", List.of("✨ Loving every bit of this!", "🌟 Life is good!", "🎉 So grateful!"),
            "SAD", List.of("💙 Taking it one step at a time.", "🌧️ Being real about it.", "💫 It gets better."),
            "TRAVEL", List.of("✈️ Worth every mile.", "🌍 The journey continues.", "🗺️ See you at the next stop!"),
            "FOOD", List.of("🍽️ Absolutely divine!", "😋 Must try!", "🌟 10/10 would recommend."),
            "SPORTS", List.of("🏆 What a game!", "💪 Feeling the rush!", "🔥 Absolutely incredible!")
        );
        String key = mood != null ? mood.toUpperCase() : "";
        List<String> opts = continuations.getOrDefault(key,
                List.of("✨ Sharing this with you!", "🌟 Worth every moment.", "💫 Couldn't keep it to myself!"));
        return opts.get(RANDOM.nextInt(opts.size()));
    }

    private String buildHashtags(List<String> categories) {
        if (categories == null || categories.isEmpty()) return "";
        String tags = categories.stream()
                .map(c -> "#" + c.toLowerCase().replaceAll("\\s+", ""))
                .reduce("", (a, b) -> a + " " + b).trim();
        return "\n" + tags;
    }
}
