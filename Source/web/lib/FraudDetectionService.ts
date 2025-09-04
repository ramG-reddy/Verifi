import { SubmissionResult, SubmissionSchema } from "./types";
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
      /assured\s+returns?/gi
    ],
    score: -25,
    description: "Promises guaranteed returns"
  },
  
  // Unrealistic Returns
  {
    type: "RETURN_THRESHOLD",
    category: "UNREALISTIC_RETURNS",
    patterns: [
      /(\d+)%.*?(per\s+)?(day|week)/gi,
      /double.*?money.*?(week|month)/gi
    ],
    score: -20,
    description: "Claims unrealistic short-term returns"
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
      /today\s+only/gi
    ],
    score: -15,
    description: "Uses pressure tactics"
  },
  
  // Insider Information Claims
  {
    type: "FAKE_CREDENTIALS",
    category: "INSIDER_INFO",
    patterns: [
      /insider\s+tip/gi,
      /secret\s+information/gi,
      /exclusive\s+strategy/gi,
      /hidden\s+formula/gi
    ],
    score: -20,
    description: "Claims insider information"
  },
  
  // Positive Indicators
  {
    type: "LEGITIMATE_LANGUAGE",
    category: "PROPER_DISCLAIMERS",
    patterns: [
      /market\s+risks?/gi,
      /past\s+performance/gi,
      /consult.*?financial\s+advisor/gi,
      /subject\s+to\s+market\s+risks?/gi
    ],
    score: 5,
    description: "Uses proper risk disclaimers"
  }
];

export class FraudDetectionService {
  
  async analyzeSubmission(submissionData: SubmissionSchema): Promise<SubmissionResult> {
    // 1. Only query database for advisor verification

    if(!submissionData.advisorRegId || !submissionData.advisorName) {
      return {
        error: "Missing advisor registration ID or name"
      };
    }

    const advisorResult = await this.verifyAdvisor(
      submissionData.advisorRegId, 
      submissionData.advisorName
    );
    
    // 2. Apply hardcoded rules for text analysis
    const textAnalysisResult = this.analyzeText(submissionData.adviceText);
    
    // 3. Combine scores
    const finalScore = this.calculateFinalScore(
      advisorResult.score,
      textAnalysisResult.score
    );
    
    return {
      finalScore,
      riskLevel: this.getRiskLevel(finalScore),
      advisorVerification: advisorResult,
      detectedRedFlags: textAnalysisResult.redFlags
    };
  }
  
  private async verifyAdvisor(regId: string, advisorName: string) {
    if (!regId) {
      return { score: -5, status: "NO_REG_ID", message: "No registration ID provided" };
    }
    
    const advisor = await prisma.advisor.findUnique({
      where: { registration_id: regId }
    });
    
    if (!advisor) {
      return { score: -20, status: "INVALID_REG_ID", message: "Registration ID not found" };
    }
    
    // Check name similarity
    const similarity = this.calculateStringSimilarity(advisorName, advisor.name);
    
    if (similarity >= 0.8) {
      return { 
        score: 10, 
        status: "VERIFIED", 
        message: "Advisor verified"
      };
    } else {
      return { 
        score: -20, 
        status: "NAME_MISMATCH", 
        message: "Name doesn't match registration"
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
    SCORING_RULES.forEach(rule => {
      rule.patterns.forEach(pattern => {
        const matches = adviceText.match(pattern);
        
        if (matches) {
          totalScore += rule.score;
          detectedFlags.push({
            category: rule.category,
            description: rule.description,
            matchedText: matches[0],
            severity: this.getSeverity(rule.score)
          });
        }
      });
    });
    
    return { score: totalScore, redFlags: detectedFlags };
  }
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(0).map(() => Array(str1.length + 1).fill(0));
    
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
  
  private calculateFinalScore(advisorScore: number, textScore: number): number {
    // Normalize to 0-100 scale
    const baseScore = 50;
    const combinedScore = baseScore + advisorScore + (textScore * 0.5);
    return Math.max(0, Math.min(100, combinedScore));
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
export const ruleBasedFraudDetector = new FraudDetectionService();