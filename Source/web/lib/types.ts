export type SubmissionSchema = {
  advisorRegId?: string;
  advisorName?: string;
  adviceText: string;
  returnPercentage?: number;
  timeFrame?: string;
};

export type SubmissionResult = {
  finalScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  advisorVerification: {
    status: string;
    message: string;
    score: number;
  };
  detectedRedFlags: Array<{
    category: string;
    description: string;
    matchedText: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }>;
} | {
  error: String;
};