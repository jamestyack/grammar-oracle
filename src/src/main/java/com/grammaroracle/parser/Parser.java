package com.grammaroracle.parser;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

public class Parser {

    private static final Logger log = LoggerFactory.getLogger(Parser.class);
    private static final int MAX_PARSES = 10;
    private static final Set<String> TERMINAL_TAGS = Set.of(
            "DET", "N", "V", "V_COP", "V_EX", "A", "ADV", "PREP", "CONJ", "PRON", "NEG"
    );

    private final ProductionRules productionRules;
    private final Lexicon lexicon;

    // Failure tracking for diagnostics
    private int furthestPosition;
    private String furthestToken;
    private Set<String> expectedAtFurthest;

    // Performance metrics for the most recent parse
    private ParseMetrics lastMetrics;

    public Parser(Language language) throws Exception {
        this.productionRules = new ProductionRules(language);
        this.lexicon = new Lexicon(language);
    }

    public List<ParseMemory> parse(Sentence sentence) throws BadSentenceException {
        ParseMetrics metrics = new ParseMetrics();
        long startTime = System.nanoTime();

        // Check for unknown words first
        for (String word : sentence.getWords()) {
            if (!lexicon.containsWord(word)) {
                metrics.setParseTimeNanos(System.nanoTime() - startTime);
                this.lastMetrics = metrics;
                throw new BadSentenceException(
                        "Unknown word: '" + word + "'",
                        indexOf(sentence, word), word, Collections.emptyList()
                );
            }
        }

        if (sentence.length() == 0) {
            metrics.setParseTimeNanos(System.nanoTime() - startTime);
            this.lastMetrics = metrics;
            throw new BadSentenceException("Empty sentence");
        }

        // Initialize failure tracking
        furthestPosition = -1;
        furthestToken = null;
        expectedAtFurthest = new LinkedHashSet<>();

        List<ParseMemory> successfulParses = new ArrayList<>();
        Queue<ParseMemory> active = new LinkedList<>();
        active.add(new ParseMemory(productionRules.getStartingSymbol()));
        metrics.incrementStatesGenerated();

        while (!active.isEmpty() && successfulParses.size() < MAX_PARSES) {
            metrics.updateMaxQueueSize(active.size());
            ParseMemory memory = active.poll();
            metrics.incrementStatesExplored();

            if (!memory.hasSymbols()) {
                // All symbols consumed — check if all words consumed too
                if (memory.getPosition() == sentence.length() - 1) {
                    successfulParses.add(memory);
                }
                continue;
            }

            String symbol = memory.popSymbol();

            if (isTerminal(symbol)) {
                // Terminal: try to match against next word
                metrics.incrementTerminalAttempts();
                int nextPos = memory.getPosition() + 1;
                if (nextPos >= sentence.length()) {
                    trackFailure(memory.getPosition(), sentence, symbol);
                    continue;
                }

                String word = sentence.getWord(nextPos);
                LexiconEntry entry = lexicon.getEntry(word);

                if (entry != null && entry.hasTag(symbol)) {
                    metrics.incrementTerminalSuccesses();
                    ParseMemory next = memory.clone();
                    next.advancePosition();
                    next.recordMatch(symbol);
                    active.add(next);
                    metrics.incrementStatesGenerated();
                } else {
                    trackFailure(nextPos, sentence, symbol);
                }
            } else {
                // Non-terminal: expand with all matching rules
                List<Rule> matchingRules = productionRules.getRulesForLhs(symbol);
                if (matchingRules.isEmpty()) {
                    log.warn("No rules found for non-terminal: {}", symbol);
                    continue;
                }

                for (Rule rule : matchingRules) {
                    metrics.incrementRuleExpansions();
                    ParseMemory expanded = memory.clone();
                    expanded.expandRule(rule);
                    active.add(expanded);
                    metrics.incrementStatesGenerated();
                }
            }
        }

        metrics.setParseTimeNanos(System.nanoTime() - startTime);
        this.lastMetrics = metrics;

        if (successfulParses.isEmpty()) {
            String failToken = furthestToken != null ? furthestToken : sentence.getWord(0);
            int failIndex = Math.max(0, furthestPosition);
            List<String> expected = new ArrayList<>(expectedAtFurthest);

            throw new BadSentenceException(
                    buildFailureMessage(failIndex, failToken, expected),
                    failIndex, failToken, expected
            );
        }

        log.info("Found {} parse(s) for: {}", successfulParses.size(), sentence);
        return successfulParses;
    }

    public ParseMetrics getLastMetrics() {
        return lastMetrics;
    }

    private boolean isTerminal(String symbol) {
        return TERMINAL_TAGS.contains(symbol);
    }

    public static boolean isTerminalTag(String symbol) {
        return TERMINAL_TAGS.contains(symbol);
    }

    private void trackFailure(int position, Sentence sentence, String expectedTag) {
        if (position > furthestPosition) {
            furthestPosition = position;
            furthestToken = position < sentence.length() ? sentence.getWord(position) : "<end>";
            expectedAtFurthest = new LinkedHashSet<>();
            expectedAtFurthest.add(expectedTag);
        } else if (position == furthestPosition) {
            expectedAtFurthest.add(expectedTag);
        }
    }

    private String buildFailureMessage(int index, String token, List<String> expected) {
        if (expected.isEmpty()) {
            return "Could not parse sentence";
        }
        String expectedStr = String.join(" or ", expected);
        return "Expected " + expectedStr + " at position " + index + ", found '" + token + "'";
    }

    private int indexOf(Sentence sentence, String word) {
        for (int i = 0; i < sentence.length(); i++) {
            if (sentence.getWord(i).equals(word)) {
                return i;
            }
        }
        return 0;
    }

    public Lexicon getLexicon() {
        return lexicon;
    }

    public ProductionRules getProductionRules() {
        return productionRules;
    }
}
