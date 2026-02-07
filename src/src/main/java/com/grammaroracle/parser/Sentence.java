package com.grammaroracle.parser;

public class Sentence {

    private final String original;
    private final String[] words;

    public Sentence(String input) {
        this.original = input;
        String cleaned = input.replaceAll("[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\\s]", "")
                              .trim()
                              .toLowerCase();
        this.words = cleaned.isEmpty() ? new String[0] : cleaned.split("\\s+");
    }

    public String getOriginal() {
        return original;
    }

    public String[] getWords() {
        return words;
    }

    public int length() {
        return words.length;
    }

    public String getWord(int index) {
        return words[index];
    }

    @Override
    public String toString() {
        return String.join(" ", words);
    }
}
