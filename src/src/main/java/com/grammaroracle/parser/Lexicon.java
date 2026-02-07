package com.grammaroracle.parser;

import org.jdom2.Document;
import org.jdom2.Element;
import org.jdom2.input.SAXBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class Lexicon {

    private static final Logger log = LoggerFactory.getLogger(Lexicon.class);

    private final TreeMap<String, LexiconEntry> entries;

    public Lexicon(Language language) throws Exception {
        this.entries = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        String resource = language.getLexiconResource();
        log.info("Loading lexicon from resource: {}", resource);

        try (InputStream is = getClass().getClassLoader().getResourceAsStream(resource)) {
            if (is == null) {
                throw new IllegalArgumentException("Lexicon resource not found: " + resource);
            }
            SAXBuilder builder = new SAXBuilder();
            Document doc = builder.build(is);
            Element root = doc.getRootElement();

            for (Element entryElem : root.getChildren("entry")) {
                String word = entryElem.getChildText("kw").toLowerCase();
                List<String> tags = entryElem.getChildren("posTag").stream()
                        .map(Element::getText)
                        .collect(Collectors.toList());
                String translation = entryElem.getChildText("en");
                entries.put(word, new LexiconEntry(word, tags, translation));
            }
        }

        log.info("Loaded {} lexicon entries", entries.size());
    }

    public boolean containsWord(String word) {
        return entries.containsKey(word.toLowerCase());
    }

    public LexiconEntry getEntry(String word) {
        return entries.get(word.toLowerCase());
    }

    public List<String> getTagsForWord(String word) {
        LexiconEntry entry = getEntry(word);
        return entry != null ? entry.getPosTags() : new ArrayList<>();
    }

    public int size() {
        return entries.size();
    }
}
