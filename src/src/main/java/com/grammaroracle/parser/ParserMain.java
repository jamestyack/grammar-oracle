package com.grammaroracle.parser;

import org.json.JSONObject;

import java.util.List;

public class ParserMain {

    public static void main(String[] args) {
        String sentence = null;
        String languageStr = "SPANISH";
        boolean jsonOutput = false;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--sentence":
                    if (i + 1 < args.length) sentence = args[++i];
                    break;
                case "--language":
                    if (i + 1 < args.length) languageStr = args[++i];
                    break;
                case "--json":
                    jsonOutput = true;
                    break;
                case "--help":
                    printUsage();
                    return;
            }
        }

        if (sentence == null) {
            if (jsonOutput) {
                System.out.println(errorJson("No sentence provided. Use --sentence \"text\""));
            } else {
                System.err.println("Error: No sentence provided. Use --sentence \"text\"");
                printUsage();
            }
            System.exit(1);
            return;
        }

        try {
            Language language = Language.fromString(languageStr);
            Parser parser = new Parser(language);
            Sentence sent = new Sentence(sentence);

            if (jsonOutput) {
                JsonSerializer serializer = new JsonSerializer(parser.getLexicon());
                try {
                    List<ParseMemory> parses = parser.parse(sent);
                    JSONObject result = serializer.serializeValidParse(sent, parses);
                    System.out.println(result.toString(2));
                } catch (BadSentenceException e) {
                    JSONObject result = serializer.serializeInvalidParse(sent, e);
                    System.out.println(result.toString(2));
                }
            } else {
                try {
                    List<ParseMemory> parses = parser.parse(sent);
                    System.out.println("Valid sentence: " + sent);
                    System.out.println("Parses found: " + parses.size());
                    for (int i = 0; i < parses.size(); i++) {
                        System.out.println("\nParse " + (i + 1) + ":");
                        for (Rule rule : parses.get(i).getRulesApplied()) {
                            System.out.println("  " + rule);
                        }
                    }
                } catch (BadSentenceException e) {
                    System.out.println("Invalid sentence: " + sent);
                    System.out.println("Error: " + e.getMessage());
                }
            }
        } catch (IllegalArgumentException e) {
            String msg = "Unknown language: " + languageStr;
            if (jsonOutput) {
                System.out.println(errorJson(msg));
            } else {
                System.err.println(msg);
            }
            System.exit(1);
        } catch (Exception e) {
            String msg = "Parser initialization failed: " + e.getMessage();
            if (jsonOutput) {
                System.out.println(errorJson(msg));
            } else {
                System.err.println(msg);
                e.printStackTrace();
            }
            System.exit(1);
        }
    }

    private static String errorJson(String message) {
        JSONObject error = new JSONObject();
        error.put("valid", false);
        error.put("error", message);
        return error.toString(2);
    }

    private static void printUsage() {
        System.out.println("Grammar Oracle Parser");
        System.out.println("Usage: java -jar grammar-oracle-parser.jar [options]");
        System.out.println();
        System.out.println("Options:");
        System.out.println("  --sentence \"text\"   Sentence to parse (required)");
        System.out.println("  --language LANG      Language: SPANISH (default)");
        System.out.println("  --json               Output as JSON");
        System.out.println("  --help               Show this help");
    }
}
