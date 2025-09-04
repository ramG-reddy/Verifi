import { z } from "zod";

// Submission Schema
export const SubmissionSchema = z.object({
  advisorRegId: z.string().optional(),
  advisorName: z.string().optional(),
  adviceText: z.string().min(1, "Advice text is required"),
  returnPercentage: z.number().optional(),
  timeFrame: z.string().optional()
});

// Advisor Verification Schema
export const AdvisorVerificationSchema = z.object({
  status: z.string(),
  message: z.string(),
  score: z.number()
});

// Red Flag Schema
export const RedFlagSchema = z.object({
  category: z.string(),
  description: z.string(),
  matchedText: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
});

// ML Service Request Schema
export const MLScoreRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  returns_percentage: z.number().optional(),
  timeframe: z.string().optional()
});

// ML Service Response Schema
export const MLScoreResponseSchema = z.object({
  fraud_probability: z.number().min(0).max(1),
  prediction: z.enum(["FRAUDULENT", "LEGITIMATE"]),
  confidence_level: z.enum(["VERY_LOW", "LOW", "MEDIUM", "HIGH"]),
  risk_indicators: z.array(z.string())
});

// ML Analysis Result Schema
export const MLAnalysisSchema = z.object({
  fraudProbability: z.number().min(0).max(1),
  prediction: z.enum(["FRAUDULENT", "LEGITIMATE"]),
  confidenceLevel: z.enum(["VERY_LOW", "LOW", "MEDIUM", "HIGH"]),
  riskIndicators: z.array(z.string()),
  score: z.number()
});

// Success Submission Result Schema
export const SuccessSubmissionResultSchema = z.object({
  finalScore: z.number().min(0).max(100),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  advisorVerification: AdvisorVerificationSchema,
  detectedRedFlags: z.array(RedFlagSchema),
  mlAnalysis: MLAnalysisSchema.optional()
});

// Error Submission Result Schema
export const ErrorSubmissionResultSchema = z.object({
  error: z.string()
});

// Combined Submission Result Schema
export const SubmissionResultSchema = z.union([
  SuccessSubmissionResultSchema,
  ErrorSubmissionResultSchema
]);

// Type exports for TypeScript usage
export type SubmissionSchema = z.infer<typeof SubmissionSchema>;
export type AdvisorVerification = z.infer<typeof AdvisorVerificationSchema>;
export type RedFlag = z.infer<typeof RedFlagSchema>;
export type MLScoreRequest = z.infer<typeof MLScoreRequestSchema>;
export type MLScoreResponse = z.infer<typeof MLScoreResponseSchema>;
export type MLAnalysis = z.infer<typeof MLAnalysisSchema>;
export type SuccessSubmissionResult = z.infer<typeof SuccessSubmissionResultSchema>;
export type ErrorSubmissionResult = z.infer<typeof ErrorSubmissionResultSchema>;
export type SubmissionResult = z.infer<typeof SubmissionResultSchema>;

// API Response Schema for route handlers
export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: SubmissionResultSchema.optional(),
  error: z.string().optional(),
  details: z.array(z.string()).optional()
});

export type APIResponse = z.infer<typeof APIResponseSchema>;