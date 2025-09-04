import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple fuzzy matching function using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 100;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  
  return Math.round(similarity);
}

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
        error: 'Advisor with this registration ID not found'
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
