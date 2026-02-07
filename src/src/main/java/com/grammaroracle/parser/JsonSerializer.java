package com.grammaroracle.parser;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

public class JsonSerializer {

    private final Lexicon lexicon;

    public JsonSerializer(Lexicon lexicon) {
        this.lexicon = lexicon;
    }

    public JSONObject serializeValidParse(Sentence sentence, List<ParseMemory> parses) {
        JSONObject result = new JSONObject();
        result.put("valid", true);
        result.put("sentence", sentence.toString());

        // Tokens with POS tags and translations
        ParseMemory firstParse = parses.get(0);
        result.put("tokens", serializeTokens(sentence, firstParse));

        // Parse tree from first parse
        result.put("parseTree", buildParseTree(firstParse));

        // Rules applied
        result.put("rulesApplied", serializeRules(firstParse.getRulesApplied()));

        // Parse count and ambiguity
        result.put("parses", parses.size());
        result.put("ambiguous", parses.size() > 1);

        return result;
    }

    public JSONObject serializeInvalidParse(Sentence sentence, BadSentenceException ex) {
        JSONObject result = new JSONObject();
        result.put("valid", false);
        result.put("sentence", sentence.toString());

        // Tokens (best effort — tag what we can from lexicon)
        result.put("tokens", serializeTokensFromLexicon(sentence));

        // Failure diagnostics
        JSONObject failure = new JSONObject();
        failure.put("index", ex.getIndex());
        failure.put("token", ex.getToken() != null ? ex.getToken() : "");
        failure.put("expectedCategories", new JSONArray(ex.getExpectedCategories()));
        failure.put("message", ex.getMessage());
        result.put("failure", failure);

        return result;
    }

    private JSONArray serializeTokens(Sentence sentence, ParseMemory parse) {
        JSONArray tokens = new JSONArray();
        List<String> matchedTags = parse.getMatchedTags();

        for (int i = 0; i < sentence.length(); i++) {
            String word = sentence.getWord(i);
            LexiconEntry entry = lexicon.getEntry(word);

            JSONObject token = new JSONObject();
            token.put("word", word);
            token.put("tag", i < matchedTags.size() ? matchedTags.get(i) : "UNKNOWN");
            token.put("translation", entry != null ? entry.getTranslation() : "");
            tokens.put(token);
        }

        return tokens;
    }

    private JSONArray serializeTokensFromLexicon(Sentence sentence) {
        JSONArray tokens = new JSONArray();
        for (String word : sentence.getWords()) {
            LexiconEntry entry = lexicon.getEntry(word);
            JSONObject token = new JSONObject();
            token.put("word", word);
            if (entry != null) {
                token.put("tag", entry.getPosTags().get(0));
                token.put("translation", entry.getTranslation());
            } else {
                token.put("tag", "UNKNOWN");
                token.put("translation", "");
            }
            tokens.put(token);
        }
        return tokens;
    }

    private JSONObject buildParseTree(ParseMemory parse) {
        List<Rule> rules = parse.getRulesApplied();
        List<String> matchedTags = parse.getMatchedTags();

        if (rules.isEmpty()) {
            return new JSONObject().put("symbol", "SENTENCE").put("children", new JSONArray());
        }

        // Build tree by replaying rule applications
        int[] tagIndex = {0};
        return buildNode(rules, matchedTags, tagIndex, new int[]{0}, rules.get(0).getLhs());
    }

    private JSONObject buildNode(List<Rule> rules, List<String> matchedTags,
                                  int[] tagIndex, int[] ruleIndex, String symbol) {
        JSONObject node = new JSONObject();
        node.put("symbol", symbol);

        // Find the next rule that expands this symbol
        int ri = ruleIndex[0];
        Rule matchingRule = null;
        for (int i = ri; i < rules.size(); i++) {
            if (rules.get(i).getLhs().equals(symbol)) {
                matchingRule = rules.get(i);
                ruleIndex[0] = i + 1;
                break;
            }
        }

        if (matchingRule != null) {
            JSONArray children = new JSONArray();
            for (String rhsSymbol : matchingRule.getRhs()) {
                if (isTerminal(rhsSymbol)) {
                    // Leaf node
                    JSONObject leaf = new JSONObject();
                    leaf.put("symbol", rhsSymbol);
                    if (tagIndex[0] < matchedTags.size()) {
                        leaf.put("word", true);
                        tagIndex[0]++;
                    }
                    children.put(leaf);
                } else {
                    // Recurse for non-terminal
                    children.put(buildNode(rules, matchedTags, tagIndex, ruleIndex, rhsSymbol));
                }
            }
            node.put("children", children);
        }

        return node;
    }

    private boolean isTerminal(String symbol) {
        return Parser.isTerminalTag(symbol);
    }

    private JSONArray serializeRules(List<Rule> rules) {
        JSONArray arr = new JSONArray();
        for (Rule rule : rules) {
            JSONObject obj = new JSONObject();
            obj.put("number", rule.getNumber());
            obj.put("rule", rule.getLhs() + " -> " + String.join(" ", rule.getRhs()));
            arr.put(obj);
        }
        return arr;
    }
}
