import { NextRequest, NextResponse } from 'next/server';
import { ruleBasedFraudDetector } from '@/lib/FraudDetectionService';
import { SubmissionSchema } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: SubmissionSchema = await request.json();
    
    // Validate required fields
    if (!body.adviceText || body.adviceText.trim() === '') {
      return NextResponse.json(
        { error: 'Advice text is required' },
        { status: 400 }
      );
    }
    
    // Analyze the submission
    const result = await ruleBasedFraudDetector.analyzeSubmission(body);
    
    // Check if there was an error in the analysis
    if ('error' in result) {
      return NextResponse.json(result, { status: 400 });
    }
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Error analyzing advice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST method to submit advice for analysis' },
    { status: 405 }
  );
}
