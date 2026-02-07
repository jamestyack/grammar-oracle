package com.grammaroracle.parser;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class LexiconEntry {

    private final String word;
    private final List<String> posTags;
    private final String translation;

    public LexiconEntry(String word, List<String> posTags, String translation) {
        this.word = word;
        this.posTags = Collections.unmodifiableList(new ArrayList<>(posTags));
        this.translation = translation;
    }

    public String getWord() {
        return word;
    }

    public List<String> getPosTags() {
        return posTags;
    }

    public String getTranslation() {
        return translation;
    }

    public boolean hasTag(String tag) {
        return posTags.contains(tag);
    }

    @Override
    public String toString() {
        return word + " [" + String.join(", ", posTags) + "] (" + translation + ")";
    }
}
