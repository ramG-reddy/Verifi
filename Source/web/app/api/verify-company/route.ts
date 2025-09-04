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
    
    // Find company by registration ID
    const company = await prisma.company.findUnique({
      where: {
        registration_id: registrationId.toUpperCase()
      }
    });
    
    if (!company) {
      return NextResponse.json({
        exists: false,
        error: 'Company with this registration ID not found'
      });
    }
    
    // Calculate name similarity
    const nameScore = calculateSimilarity(name, company.name);
    
    return NextResponse.json({
      exists: true,
      nameScore,
      company: {
        registration_id: company.registration_id,
        name: company.name,
        status: company.status,
        company_type: company.company_type,
        registration_date: company.registration_date?.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error verifying company:', error);
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}