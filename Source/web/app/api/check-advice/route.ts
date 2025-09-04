import { NextRequest, NextResponse } from "next/server";
import { FraudDetector } from "@/lib/FraudDetectionService";
import { SubmissionSchema, SubmissionResultSchema } from "@/lib/types";
import { z } from "zod";


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validatedBody = SubmissionSchema.parse(body);

    if (!validatedBody.adviceText || validatedBody.adviceText.trim() === "") {
      return NextResponse.json(
        { error: "Advice text is required" },
        { status: 400 }
      );
    }

    // Get analysis from fraud detection service (includes ML integration)
    const result = await FraudDetector.analyzeSubmission(validatedBody);

    // Validate response with Zod
    const validatedResult = SubmissionResultSchema.parse(result);

    if ("error" in validatedResult) {
      return NextResponse.json(validatedResult, { status: 400 });
    }

    return NextResponse.json(validatedResult, { status: 200 });
  } catch (error) {
    console.error("Error analyzing advice:", error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid input data", 
          details: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Use POST method to submit advice for analysis" },
    { status: 405 }
  );
}
