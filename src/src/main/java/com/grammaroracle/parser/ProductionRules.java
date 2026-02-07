package com.grammaroracle.parser;

import org.jdom2.Document;
import org.jdom2.Element;
import org.jdom2.input.SAXBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public class ProductionRules {

    private static final Logger log = LoggerFactory.getLogger(ProductionRules.class);

    private final List<Rule> rules;
    private final String startingSymbol;

    public ProductionRules(Language language) throws Exception {
        this.rules = new ArrayList<>();
        String resource = language.getGrammarResource();
        log.info("Loading grammar from resource: {}", resource);

        try (InputStream is = getClass().getClassLoader().getResourceAsStream(resource)) {
            if (is == null) {
                throw new IllegalArgumentException("Grammar resource not found: " + resource);
            }
            SAXBuilder builder = new SAXBuilder();
            Document doc = builder.build(is);
            Element root = doc.getRootElement();
            this.startingSymbol = root.getAttributeValue("start");

            for (Element ruleElem : root.getChildren("rule")) {
                int number = Integer.parseInt(ruleElem.getAttributeValue("number"));
                String lhs = ruleElem.getChildText("lhs");
                List<String> rhs = ruleElem.getChildren("rhs").stream()
                        .map(Element::getText)
                        .collect(Collectors.toList());
                rules.add(new Rule(number, lhs, rhs));
            }
        }

        log.info("Loaded {} rules with starting symbol '{}'", rules.size(), startingSymbol);
        validate();
    }

    private void validate() {
        for (Rule rule : rules) {
            if (rule.rhsContains(rule.getLhs())) {
                log.warn("Direct recursion detected in rule: {}", rule);
            }
        }

        boolean hasStart = rules.stream().anyMatch(r -> r.lhsMatches(startingSymbol));
        if (!hasStart) {
            throw new IllegalStateException("No rule produces starting symbol: " + startingSymbol);
        }
    }

    public String getStartingSymbol() {
        return startingSymbol;
    }

    public List<Rule> getRulesForLhs(String symbol) {
        return rules.stream()
                .filter(r -> r.lhsMatches(symbol))
                .collect(Collectors.toList());
    }

    public List<Rule> getAllRules() {
        return Collections.unmodifiableList(rules);
    }

    public int size() {
        return rules.size();
    }
}
