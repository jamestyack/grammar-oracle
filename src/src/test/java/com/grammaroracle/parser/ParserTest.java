package com.grammaroracle.parser;

import org.json.JSONObject;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ParserTest {

    private static Parser parser;

    @BeforeAll
    static void setUp() throws Exception {
        parser = new Parser(Language.SPANISH);
    }

    // --- Grammar and Lexicon Loading ---

    @Test
    void grammarLoadsSuccessfully() {
        assertNotNull(parser.getProductionRules());
        assertTrue(parser.getProductionRules().size() > 0);
    }

    @Test
    void lexiconLoadsSuccessfully() {
        assertNotNull(parser.getLexicon());
        assertTrue(parser.getLexicon().size() > 0);
    }

    @Test
    void lexiconContainsExpectedWords() {
        assertTrue(parser.getLexicon().containsWord("el"));
        assertTrue(parser.getLexicon().containsWord("perro"));
        assertTrue(parser.getLexicon().containsWord("es"));
        assertTrue(parser.getLexicon().containsWord("grande"));
    }

    @Test
    void lexiconIsCaseInsensitive() {
        assertTrue(parser.getLexicon().containsWord("El"));
        assertTrue(parser.getLexicon().containsWord("EL"));
        assertTrue(parser.getLexicon().containsWord("Perro"));
    }

    // --- Valid Parsing ---

    @Test
    void parsesSimpleCopularSentence() throws Exception {
        // "el perro es grande" - The dog is big
        Sentence sent = new Sentence("el perro es grande");
        List<ParseMemory> parses = parser.parse(sent);
        assertFalse(parses.isEmpty());
    }

    @Test
    void parsesIntransitiveSentence() throws Exception {
        // "el perro corre" - The dog runs
        Sentence sent = new Sentence("el perro corre");
        List<ParseMemory> parses = parser.parse(sent);
        assertFalse(parses.isEmpty());
    }

    @Test
    void parsesExistentialSentence() throws Exception {
        // "hay un perro" - There is a dog
        Sentence sent = new Sentence("hay un perro");
        List<ParseMemory> parses = parser.parse(sent);
        assertFalse(parses.isEmpty());
    }

    @Test
    void parsesTransitiveSentence() throws Exception {
        // "el hombre come la manzana" - The man eats the apple
        Sentence sent = new Sentence("el hombre come la manzana");
        List<ParseMemory> parses = parser.parse(sent);
        assertFalse(parses.isEmpty());
    }

    @Test
    void parsesNounWithPostposedAdjective() throws Exception {
        // "el perro grande corre" - The big dog runs
        Sentence sent = new Sentence("el perro grande corre");
        List<ParseMemory> parses = parser.parse(sent);
        assertFalse(parses.isEmpty());
    }

    @Test
    void parsesNounWithPreposedAdjective() throws Exception {
        // "el gran perro corre" - The great dog runs
        Sentence sent = new Sentence("el gran perro corre");
        List<ParseMemory> parses = parser.parse(sent);
        assertFalse(parses.isEmpty());
    }

    @Test
    void parseRecordsRulesApplied() throws Exception {
        Sentence sent = new Sentence("el perro es grande");
        List<ParseMemory> parses = parser.parse(sent);
        ParseMemory parse = parses.get(0);
        assertFalse(parse.getRulesApplied().isEmpty());
    }

    // --- Invalid Parsing ---

    @Test
    void rejectsAdjectiveFirst() {
        // "grande perro" - adjective before noun without determiner
        Sentence sent = new Sentence("grande perro");
        BadSentenceException ex = assertThrows(BadSentenceException.class,
                () -> parser.parse(sent));
        assertNotNull(ex.getMessage());
    }

    @Test
    void rejectsUnknownWord() {
        Sentence sent = new Sentence("el xyz es grande");
        BadSentenceException ex = assertThrows(BadSentenceException.class,
                () -> parser.parse(sent));
        assertTrue(ex.getMessage().contains("Unknown word"));
    }

    @Test
    void rejectsEmptySentence() {
        Sentence sent = new Sentence("");
        assertThrows(BadSentenceException.class, () -> parser.parse(sent));
    }

    @Test
    void failureDiagnosticsProvideIndex() {
        Sentence sent = new Sentence("grande perro");
        BadSentenceException ex = assertThrows(BadSentenceException.class,
                () -> parser.parse(sent));
        assertTrue(ex.getIndex() >= 0);
    }

    // --- JSON Serialization ---

    @Test
    void validParseProducesCorrectJson() throws Exception {
        Sentence sent = new Sentence("el perro es grande");
        List<ParseMemory> parses = parser.parse(sent);
        JsonSerializer serializer = new JsonSerializer(parser.getLexicon());

        JSONObject json = serializer.serializeValidParse(sent, parses);
        assertTrue(json.getBoolean("valid"));
        assertEquals("el perro es grande", json.getString("sentence"));
        assertTrue(json.has("tokens"));
        assertTrue(json.has("parseTree"));
        assertTrue(json.has("rulesApplied"));
        assertEquals(parses.size(), json.getInt("parses"));
    }

    @Test
    void invalidParseProducesCorrectJson() {
        Sentence sent = new Sentence("grande perro");
        JsonSerializer serializer = new JsonSerializer(parser.getLexicon());

        try {
            parser.parse(sent);
            fail("Should have thrown BadSentenceException");
        } catch (BadSentenceException ex) {
            JSONObject json = serializer.serializeInvalidParse(sent, ex);
            assertFalse(json.getBoolean("valid"));
            assertTrue(json.has("failure"));
            assertTrue(json.getJSONObject("failure").has("index"));
            assertTrue(json.getJSONObject("failure").has("expectedCategories"));
        }
    }

    @Test
    void jsonTokensIncludeTranslations() throws Exception {
        Sentence sent = new Sentence("el perro es grande");
        List<ParseMemory> parses = parser.parse(sent);
        JsonSerializer serializer = new JsonSerializer(parser.getLexicon());

        JSONObject json = serializer.serializeValidParse(sent, parses);
        var tokens = json.getJSONArray("tokens");
        assertTrue(tokens.length() > 0);
        assertTrue(tokens.getJSONObject(0).has("translation"));
    }

    // --- Sentence Tokenization ---

    @Test
    void sentenceStripsAccentedPunctuation() {
        Sentence sent = new Sentence("¡El perro es grande!");
        assertEquals(4, sent.length());
        assertEquals("el", sent.getWord(0));
    }

    @Test
    void sentenceHandlesExtraWhitespace() {
        Sentence sent = new Sentence("  el   perro   es   grande  ");
        assertEquals(4, sent.length());
    }
}
