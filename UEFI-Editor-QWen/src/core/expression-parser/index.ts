/**
 * IFR Expression Parser Module
 * Parses and analyzes UEFI IFR (Internal Form Representation) expressions
 * @module core/expression-parser
 */

import type { ConditionSource, VarStores } from "../types";

/**
 * Parsed expression result
 */
export interface ParsedExpression {
  readonly source: ConditionSource;
  readonly varStoreId?: string;
  readonly varStoreName?: string;
  readonly questionId?: string;
  readonly isConstant: boolean;
  readonly constantValue?: boolean;
  readonly rawExpression: string;
}

/**
 * Token types for expression parsing
 */
type TokenType =
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "OPERATOR"
  | "PAREN_OPEN"
  | "PAREN_CLOSE"
  | "COMMA"
  | "EOF";

interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly position: number;
}

/**
 * Lexer for tokenizing IFR expressions
 */
class ExpressionLexer {
  private readonly input: string;
  private position: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): readonly Token[] {
    const tokens: Token[] = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();

      if (this.position >= this.input.length) {
        break;
      }

      const char: string = this.input[this.position]!;

      switch (char) {
        case "(":
          tokens.push({ type: "PAREN_OPEN", value: "(", position: this.position });
          this.position++;
          break;
        case ")":
          tokens.push({ type: "PAREN_CLOSE", value: ")", position: this.position });
          this.position++;
          break;
        case ",":
          tokens.push({ type: "COMMA", value: ",", position: this.position });
          this.position++;
          break;
        case "=":
        case "!":
        case "&":
        case "|":
        case "<":
        case ">":
          tokens.push(this.readOperator());
          break;
        case '"':
          tokens.push(this.readString());
          break;
        default:
          if (/\d/.test(char)) {
            tokens.push(this.readNumber());
          } else if (/[a-zA-Z_]/.test(char)) {
            tokens.push(this.readIdentifier());
          } else {
            this.position++;
          }
      }
    }

    tokens.push({ type: "EOF", value: "", position: this.position });
    return tokens;
  }

  private skipWhitespace(): void {
    while (
      this.position < this.input.length &&
      /\s/.test(this.input[this.position]!)
    ) {
      this.position++;
    }
  }

  private readOperator(): Token {
    const start: number = this.position;
    let value: string = "";

    while (
      this.position < this.input.length &&
      /[=!&|<>]/.test(this.input[this.position]!)
    ) {
      value += this.input[this.position];
      this.position++;
    }

    return { type: "OPERATOR", value, position: start };
  }

  private readString(): Token {
    const start: number = this.position;
    this.position++; // Skip opening quote

    let value: string = "";
    while (
      this.position < this.input.length &&
      this.input[this.position] !== '"'
    ) {
      value += this.input[this.position];
      this.position++;
    }

    this.position++; // Skip closing quote
    return { type: "STRING", value, position: start };
  }

  private readNumber(): Token {
    const start: number = this.position;
    let value: string = "";

    while (
      this.position < this.input.length &&
      /[\dxa-fA-F]/.test(this.input[this.position]!)
    ) {
      value += this.input[this.position];
      this.position++;
    }

    return { type: "NUMBER", value, position: start };
  }

  private readIdentifier(): Token {
    const start: number = this.position;
    let value: string = "";

    while (
      this.position < this.input.length &&
      /[a-zA-Z0-9_]/.test(this.input[this.position]!)
    ) {
      value += this.input[this.position];
      this.position++;
    }

    return { type: "IDENTIFIER", value, position: start };
  }
}

/**
 * Determines the source of a condition based on variable name patterns
 * @param varName - Variable name to analyze
 * @returns ConditionSource indicating the variable origin
 */
function determineConditionSource(varName: string): ConditionSource {
  const lowerName: string = varName.toLowerCase();

  if (lowerName.includes("setup") || lowerName.includes("config")) {
    return "setup";
  }

  if (
    lowerName.includes("cpu") ||
    lowerName.includes("platform") ||
    lowerName.includes("hardware") ||
    lowerName.includes("cap")
  ) {
    return "hardware";
  }

  if (
    lowerName.includes("access") ||
    lowerName.includes("admin") ||
    lowerName.includes("security") ||
    lowerName.includes("user")
  ) {
    return "access";
  }

  if (
    lowerName.includes("ui") ||
    lowerName.includes("menu") ||
    lowerName.includes("page") ||
    lowerName.includes("navigation")
  ) {
    return "ui";
  }

  return "runtime";
}

/**
 * Parses an IFR expression and extracts condition information
 * @param expression - Raw IFR expression string
 * @param varStores - Available variable stores for lookup
 * @returns ParsedExpression with analyzed condition data
 */
export function parseExpression(
  expression: string,
  varStores: VarStores,
): ParsedExpression {
  const trimmedExpression: string = expression.trim();

  // Check for constant expressions
  if (/^(true|false|0x[01]|1|0)$/i.test(trimmedExpression)) {
    return {
      source: "constant",
      isConstant: true,
      constantValue: /^(true|0x1|1)$/i.test(trimmedExpression),
      rawExpression: expression,
    };
  }

  // Extract variable references using regex
  const varRefMatch: RegExpMatchArray | null = trimmedExpression.match(
    /(?:QuestionRef|VarStoreRef)\s*\(\s*0x([0-9A-Fa-f]+)(?:,\s*0x([0-9A-Fa-f]+))?\s*\)/i,
  );

  if (varRefMatch !== null) {
    const questionId: string | undefined = varRefMatch[1];
    const varStoreId: string | undefined = varRefMatch[2];

    let varStoreName: string | undefined;
    if (varStoreId !== undefined) {
      const matchedStore = varStores.find(
        (store) => store.varStoreId === `0x${varStoreId}`,
      );
      varStoreName = matchedStore?.name;
    }

    const source: ConditionSource =
      varStoreName !== undefined
        ? determineConditionSource(varStoreName)
        : "unknown";

    return {
      source,
      varStoreId: varStoreId !== undefined ? `0x${varStoreId}` : undefined,
      varStoreName,
      questionId: questionId !== undefined ? `0x${questionId}` : undefined,
      isConstant: false,
      rawExpression: expression,
    };
  }

  // Fallback for unparsed expressions
  return {
    source: "unknown",
    isConstant: false,
    rawExpression: expression,
  };
}

/**
 * Analyzes multiple conditions and returns summary
 * @param conditions - Array of condition expressions
 * @param varStores - Available variable stores
 * @returns Array of parsed expressions
 */
export function analyzeConditions(
  conditions: readonly string[],
  varStores: VarStores,
): readonly ParsedExpression[] {
  return conditions.map((condition) =>
    parseExpression(condition, varStores),
  );
}
