package com.grammaroracle.parser;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Rule {

    private final int number;
    private final String lhs;
    private final List<String> rhs;

    public Rule(int number, String lhs, List<String> rhs) {
        this.number = number;
        this.lhs = lhs;
        this.rhs = Collections.unmodifiableList(new ArrayList<>(rhs));
    }

    public int getNumber() {
        return number;
    }

    public String getLhs() {
        return lhs;
    }

    public List<String> getRhs() {
        return rhs;
    }

    public boolean lhsMatches(String symbol) {
        return lhs.equals(symbol);
    }

    public boolean rhsContains(String symbol) {
        return rhs.contains(symbol);
    }

    @Override
    public String toString() {
        return "RULE " + number + ": " + lhs + " -> " + String.join(" ", rhs);
    }
}
