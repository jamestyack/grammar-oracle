package com.grammaroracle.parser;

/**
 * Tracks performance metrics during a parse operation.
 * Captures the amount of work the BFS parser does to find (or fail to find) a parse.
 */
public class ParseMetrics {
    private int statesExplored = 0;
    private int statesGenerated = 0;
    private int maxQueueSize = 0;
    private int ruleExpansions = 0;
    private int terminalAttempts = 0;
    private int terminalSuccesses = 0;
    private long parseTimeNanos = 0;

    public void incrementStatesExplored() { statesExplored++; }
    public void incrementStatesGenerated() { statesGenerated++; }
    public void incrementRuleExpansions() { ruleExpansions++; }
    public void incrementTerminalAttempts() { terminalAttempts++; }
    public void incrementTerminalSuccesses() { terminalSuccesses++; }

    public void updateMaxQueueSize(int size) {
        if (size > maxQueueSize) maxQueueSize = size;
    }

    public void setParseTimeNanos(long nanos) { this.parseTimeNanos = nanos; }

    public int getStatesExplored() { return statesExplored; }
    public int getStatesGenerated() { return statesGenerated; }
    public int getMaxQueueSize() { return maxQueueSize; }
    public int getRuleExpansions() { return ruleExpansions; }
    public int getTerminalAttempts() { return terminalAttempts; }
    public int getTerminalSuccesses() { return terminalSuccesses; }
    public long getParseTimeNanos() { return parseTimeNanos; }

    public double getParseTimeMs() {
        return parseTimeNanos / 1_000_000.0;
    }
}
