import {
  SubmissionResult,
  SubmissionSchema,
  MLScoreRequest,
  MLScoreResponse,
  MLScoreRequestSchema,
  MLScoreResponseSchema,
  SuccessSubmissionResult,
  ErrorSubmissionResult,
  MLAnalysis,
} from "./types";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Backend implementation with hardcoded scoring rules
const SCORING_RULES = [
  // Guaranteed Returns (Critical Red Flag)
  {
    type: "PHRASE_DETECTION",
    category: "GUARANTEED_RETURNS",
    patterns: [
      /guaranteed\s+returns?/gi,
      /100%\s+profit/gi,
      /risk\s*-?\s*free/gi,
      /assured\s+returns?/gi,
    ],
    score: -25,
    description: "Promises guaranteed returns",
  },

  // Unrealistic Returns
  {
    type: "RETURN_THRESHOLD",
    category: "UNREALISTIC_RETURNS",
    patterns: [
      /(\d+)%.*?(per\s+)?(day|week)/gi,
      /double.*?money.*?(week|month)/gi,
    ],
    score: -20,
    description: "Claims unrealistic short-term returns",
  },

  // Pressure Tactics
  {
    type: "URGENCY",
    category: "PRESSURE_TACTICS",
    patterns: [
      /limited\s+time/gi,
      /act\s+now/gi,
      /hurry\s+up/gi,
      /offer\s+expires/gi,
      /today\s+only/gi,
    ],
    score: -15,
    description: "Uses pressure tactics",
  },

  // Insider Information Claims
  {
    type: "FAKE_CREDENTIALS",
    category: "INSIDER_INFO",
    patterns: [
      /insider\s+tip/gi,
      /secret\s+information/gi,
      /exclusive\s+strategy/gi,
      /hidden\s+formula/gi,
    ],
    score: -20,
    description: "Claims insider information",
  },

  // Positive Indicators
  {
    type: "LEGITIMATE_LANGUAGE",
    category: "PROPER_DISCLAIMERS",
    patterns: [
      /market\s+risks?/gi,
      /past\s+performance/gi,
      /consult.*?financial\s+advisor/gi,
      /subject\s+to\s+market\s+risks?/gi,
    ],
    score: 5,
    description: "Uses proper risk disclaimers",
  },
];

export class FraudDetectionService {
  async analyzeSubmission(
    submissionData: SubmissionSchema
  ): Promise<SubmissionResult> {
    // 1. Validate input data
    const validatedData = SubmissionSchema.parse(submissionData);

    let advisorResult = {
      score: -10,
      status: "NO_REG_ID",
      message: "Advisor registration ID isn't available",
    };

    if (!validatedData.advisorName)
      validatedData.advisorName = "<Unknown Advisor>";

    try {
      if (validatedData.advisorRegId) {
        advisorResult = await this.verifyAdvisor(
          validatedData.advisorRegId,
          validatedData.advisorName
        );
      }
    } catch (error) {
      return {
        error: "Error verifying advisor with the given ID.",
      };
    }

    // 2. Apply hardcoded rules for text analysis
    const textAnalysisResult = this.analyzeText(validatedData.adviceText);

    // 3. ML service analysis
    let mlAnalysis: MLAnalysis | undefined;
    try {
      mlAnalysis = await this.analyzeWithML(
        validatedData.adviceText,
        validatedData.returnPercentage,
        validatedData.timeFrame
      );
    } catch (error) {
      console.error("ML service error:", error);
      // Continue without ML analysis if service is unavailable
    }

    // 4. Calculate final score with ML integration
    const finalScore = this.calculateEnhancedFinalScore(
      advisorResult.score,
      textAnalysisResult.score,
      mlAnalysis?.score
    );

    return {
      finalScore,
      riskLevel: this.getRiskLevel(finalScore),
      advisorVerification: advisorResult,
      detectedRedFlags: textAnalysisResult.redFlags,
      mlAnalysis,
    };
  }

  private async analyzeWithML(
    adviceText: string,
    returnPercentage?: number,
    timeFrame?: string
  ): Promise<MLAnalysis> {
    const ML_SERVICE_URL =
      process.env.ML_SERVICE_URL || "http://localhost:8000/score";

    // Extract returns percentage and timeframe from text if not provided
    const extractedReturns =
      returnPercentage || this.extractReturnsFromText(adviceText);
    const extractedTimeframe =
      timeFrame || this.extractTimeframeFromText(adviceText);

    const requestData: MLScoreRequest = {
      text: adviceText,
      returns_percentage: extractedReturns,
      timeframe: extractedTimeframe,
    };

    // Validate request data with Zod
    const validatedRequest = MLScoreRequestSchema.parse(requestData);

    const response = await fetch(`${ML_SERVICE_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedRequest),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // console.log("Here is the RESPONSE: ", response);

    if (!response.ok) {
      throw new Error(
        `ML service returned ${response.status}: ${response.statusText}`
      );
    }

    // Use response.json() to parse the JSON response directly
    let mlResult;
    try {
      mlResult = await response.json();
    } catch (error) {
      console.error("Error parsing ML service response:", error);
      throw new Error(`Failed to parse ML service response: ${error}`);
    }

    // Validate response data with Zod
    const validatedResponse = MLScoreResponseSchema.parse(mlResult);

    // Convert ML probability to score (-50 to +50 range)
    const mlScore = (1 - validatedResponse.fraud_probability) * 100 - 50;

    return {
      fraudProbability: validatedResponse.fraud_probability,
      prediction: validatedResponse.prediction,
      confidenceLevel: validatedResponse.confidence_level,
      riskIndicators: validatedResponse.risk_indicators,
      score: mlScore,
    };
  }

  private extractReturnsFromText(text: string): number | undefined {
    const returnsMatch = text.match(/(\d+)%/);
    return returnsMatch ? parseInt(returnsMatch[1]) : undefined;
  }

  private extractTimeframeFromText(text: string): string | undefined {
    const timeframePatterns = [
      { pattern: /(\d+)\s*hours?/i, unit: "hours" },
      { pattern: /(\d+)\s*days?/i, unit: "days" },
      { pattern: /(\d+)\s*weeks?/i, unit: "weeks" },
      { pattern: /(\d+)\s*months?/i, unit: "months" },
      { pattern: /daily/i, value: "daily" },
      { pattern: /weekly/i, value: "weekly" },
      { pattern: /monthly/i, value: "monthly" },
    ];

    for (const { pattern, unit, value } of timeframePatterns) {
      const match = text.match(pattern);
      if (match) {
        return value || `${match[1]} ${unit}`;
      }
    }
    return undefined;
  }

  private async verifyAdvisor(regId: string, advisorName: string) {
    if (!regId) {
      return {
        score: -5,
        status: "NO_REG_ID",
        message: "No registration ID provided",
      };
    }

    const advisor = await prisma.advisor.findUnique({
      where: { registration_id: regId },
    });

    if (!advisor) {
      return {
        score: -20,
        status: "INVALID_REG_ID",
        message: "Registration ID not found",
      };
    }

    // Check name similarity
    const similarity = this.calculateStringSimilarity(
      advisorName,
      advisor.name
    );

    if (similarity >= 0.8) {
      return {
        score: 10,
        status: "VERIFIED",
        message: "Advisor verified",
      };
    } else {
      return {
        score: -20,
        status: "NAME_MISMATCH",
        message: "Name doesn't match registration",
      };
    }
  }

  private analyzeText(adviceText: string) {
    let totalScore = 0;
    const detectedFlags: Array<{
      category: string;
      description: string;
      matchedText: string;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    }> = [];

    // Apply each hardcoded rule
    SCORING_RULES.forEach((rule) => {
      rule.patterns.forEach((pattern) => {
        const matches = adviceText.match(pattern);

        if (matches) {
          totalScore += rule.score;
          detectedFlags.push({
            category: rule.category,
            description: rule.description,
            matchedText: matches[0],
            severity: this.getSeverity(rule.score),
          });
        }
      });
    });

    return { score: totalScore, redFlags: detectedFlags };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Normalize strings for comparison
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");
    const normalized1 = normalize(str1);
    const normalized2 = normalize(str2);

    // If exact match after normalization
    if (normalized1 === normalized2) return 1.0;

    // Check if one is a substring of the other (for partial name matches)
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      const longer =
        normalized1.length > normalized2.length ? normalized1 : normalized2;
      const shorter =
        normalized1.length > normalized2.length ? normalized2 : normalized1;
      return Math.max(0.8, shorter.length / longer.length);
    }

    // Split into words for better matching
    const words1 = normalized1.split(/\s+/);
    const words2 = normalized2.split(/\s+/);

    // Check word-level matches (useful for "John Smith" vs "Smith John")
    let wordMatches = 0;
    let totalWords = Math.max(words1.length, words2.length);

    for (const word1 of words1) {
      for (const word2 of words2) {
        if (this.wordSimilarity(word1, word2) >= 0.8) {
          wordMatches++;
          break;
        }
      }
    }

    const wordMatchScore = wordMatches / totalWords;

    // Use Levenshtein distance for character-level similarity
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const longer = Math.max(normalized1.length, normalized2.length);
    const characterMatchScore = longer > 0 ? (longer - distance) / longer : 1.0;

    // Combine word-level and character-level similarity with higher weight on word matching
    const finalScore = wordMatchScore * 0.7 + characterMatchScore * 0.3;

    // Lower threshold for acceptance - be more lenient
    return finalScore;
  }

  private wordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0;
    if (word1.length === 0 || word2.length === 0) return 0.0;

    // Check if one word is contained in another (for abbreviations)
    if (word1.includes(word2) || word2.includes(word1)) {
      return Math.max(
        0.8,
        Math.min(word1.length, word2.length) /
          Math.max(word1.length, word2.length)
      );
    }

    // Use Levenshtein for individual words
    const distance = this.levenshteinDistance(word1, word2);
    const longer = Math.max(word1.length, word2.length);
    return (longer - distance) / longer;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(0)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private calculateEnhancedFinalScore(
    advisorScore: number,
    textScore: number,
    mlScore?: number
  ): number {
    const baseScore = 50;

    if (mlScore !== undefined) {
      // Use weighted combination: 20% advisor, 30% rules, 50% ML
      const combinedScore =
        baseScore + advisorScore * 0.2 + textScore * 0.3 + mlScore * 0.5;
      return Math.max(0, Math.min(100, combinedScore));
    } else {
      // Fallback to original calculation if ML unavailable
      const combinedScore = baseScore + advisorScore + textScore * 0.5;
      return Math.max(0, Math.min(100, combinedScore));
    }
  }

  private getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score >= 70) return "LOW";
    if (score >= 40) return "MEDIUM";
    if (score >= 20) return "HIGH";
    return "CRITICAL";
  }

  private getSeverity(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (score <= -20) return "CRITICAL";
    if (score <= -10) return "HIGH";
    if (score <= -5) return "MEDIUM";
    return "LOW";
  }
}

// Export instance for use
export const FraudDetector = new FraudDetectionService();
