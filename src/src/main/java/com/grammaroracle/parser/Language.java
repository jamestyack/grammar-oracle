package com.grammaroracle.parser;

public enum Language {
    SPANISH("spanish"),
    CORNISH("cornish");

    private final String resourcePrefix;

    Language(String resourcePrefix) {
        this.resourcePrefix = resourcePrefix;
    }

    public String getResourcePrefix() {
        return resourcePrefix;
    }

    public String getGrammarResource() {
        return resourcePrefix + "_grammar.xml";
    }

    public String getLexiconResource() {
        return resourcePrefix + "_lexicon.xml";
    }

    public static Language fromString(String name) {
        return Language.valueOf(name.toUpperCase());
    }
}
