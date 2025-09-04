import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSimilarity } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { registrationId, name } = await request.json();
    
    if (!registrationId || !name) {
      return NextResponse.json(
        { exists: false, error: 'Registration ID and name are required' },
        { status: 400 }
      );
    }
    
    // Find advisor by registration ID
    const advisor = await prisma.advisor.findUnique({
      where: {
        registration_id: registrationId.toUpperCase()
      }
    });
    
    if (!advisor) {
      return NextResponse.json({
        exists: false,
        error: 'Advisor with this registration ID not found in our records'
      });
    }
    
    // Calculate name similarity
    const nameScore = calculateSimilarity(name, advisor.name);
    
    return NextResponse.json({
      exists: true,
      nameScore,
      advisor: {
        registration_id: advisor.registration_id,
        name: advisor.name,
        status: advisor.status,
        registration_date: advisor.registration_date?.toISOString(),
        category: advisor.category
      }
    });
    
  } catch (error) {
    console.error('Error verifying advisor:', error);
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}