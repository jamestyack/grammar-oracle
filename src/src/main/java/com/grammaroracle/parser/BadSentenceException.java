package com.grammaroracle.parser;

import java.util.Collections;
import java.util.List;

public class BadSentenceException extends Exception {

    private final int index;
    private final String token;
    private final List<String> expectedCategories;

    public BadSentenceException(String message) {
        this(message, -1, null, Collections.emptyList());
    }

    public BadSentenceException(String message, int index, String token, List<String> expectedCategories) {
        super(message);
        this.index = index;
        this.token = token;
        this.expectedCategories = expectedCategories != null
                ? Collections.unmodifiableList(expectedCategories)
                : Collections.emptyList();
    }

    public int getIndex() {
        return index;
    }

    public String getToken() {
        return token;
    }

    public List<String> getExpectedCategories() {
        return expectedCategories;
    }
}
