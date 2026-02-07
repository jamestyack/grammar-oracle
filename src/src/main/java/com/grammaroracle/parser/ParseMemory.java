package com.grammaroracle.parser;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

public class ParseMemory implements Cloneable {

    private int position;
    private final Deque<String> symbolStack;
    private final List<Rule> rulesApplied;
    private final List<String> matchedTags;

    public ParseMemory(String startingSymbol) {
        this.position = -1;
        this.symbolStack = new ArrayDeque<>();
        this.symbolStack.push(startingSymbol);
        this.rulesApplied = new ArrayList<>();
        this.matchedTags = new ArrayList<>();
    }

    private ParseMemory(int position, Deque<String> symbolStack,
                        List<Rule> rulesApplied, List<String> matchedTags) {
        this.position = position;
        this.symbolStack = symbolStack;
        this.rulesApplied = rulesApplied;
        this.matchedTags = matchedTags;
    }

    public int getPosition() {
        return position;
    }

    public void advancePosition() {
        position++;
    }

    public boolean hasSymbols() {
        return !symbolStack.isEmpty();
    }

    public String popSymbol() {
        return symbolStack.pop();
    }

    public String peekSymbol() {
        return symbolStack.peek();
    }

    public void expandRule(Rule rule) {
        rulesApplied.add(rule);
        List<String> rhs = rule.getRhs();
        for (int i = rhs.size() - 1; i >= 0; i--) {
            symbolStack.push(rhs.get(i));
        }
    }

    public void recordMatch(String tag) {
        matchedTags.add(tag);
    }

    public List<Rule> getRulesApplied() {
        return rulesApplied;
    }

    public List<String> getMatchedTags() {
        return matchedTags;
    }

    @Override
    public ParseMemory clone() {
        Deque<String> stackCopy = new ArrayDeque<>(symbolStack);
        List<Rule> rulesCopy = new ArrayList<>(rulesApplied);
        List<String> tagsCopy = new ArrayList<>(matchedTags);
        return new ParseMemory(position, stackCopy, rulesCopy, tagsCopy);
    }
}
