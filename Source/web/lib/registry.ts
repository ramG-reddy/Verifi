import { prisma } from './prisma';
import { getRedis } from './redis';
import stringSimilarity from 'string-similarity';

export async function lookupRegistry(claimedRegNo?: string, advisorName?: string) {
  const redis = getRedis();

  if (claimedRegNo) {
    const key = `reg:${claimedRegNo}`;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
    
    const entry = await prisma.sebiRegistry.findUnique({ where: { reg_no: claimedRegNo } });
    const res = entry ? { found: true, entry } : { found: false };
    await redis.set(key, JSON.stringify(res), 'EX', 60 * 60);
    return res;
  }

  if (advisorName) {
    const key = `name:${advisorName.toLowerCase()}`;
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);

    // Search in registry with better matching
    const searchTerm = advisorName.toUpperCase().trim();
    
    // First try exact match
    const exactMatch = await prisma.sebiRegistry.findFirst({
      where: {
        entity_name: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }
    });

    if (exactMatch) {
      const res = { found: true, entry: exactMatch, matchConf: 1.0 };
      await redis.set(key, JSON.stringify(res), 'EX', 5 * 60);
      return res;
    }

    // Try partial matching with SEBI advisors only (exclude NSE/BSE listings)
    const sebiEntries = await prisma.sebiRegistry.findMany({ 
      where: {
        category: { notIn: ['NSE_LISTED', 'BSE_LISTED'] }
      },
      take: 500 
    });
    
    if (sebiEntries.length > 0) {
      const names = sebiEntries.map(r => r.entity_name);
      const match = stringSimilarity.findBestMatch(searchTerm, names);
      const idx = names.indexOf(match.bestMatch.target);
      const best = sebiEntries[idx];
      const matchConf = match.bestMatch.rating;
      
      const res = { found: matchConf > 0.7, entry: best, matchConf };
      await redis.set(key, JSON.stringify(res), 'EX', 5 * 60);
      return res;
    }
  }

  return { found: false };
}

export async function verifyCompanyListing(companyName: string) {
  const redis = getRedis();
  const key = `company:${companyName.toLowerCase()}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const searchTerm = companyName.toUpperCase().trim();
  
  // Check if company is listed on NSE or BSE
  const listedCompany = await prisma.sebiRegistry.findFirst({
    where: {
      AND: [
        {
          entity_name: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          category: { in: ['NSE_LISTED', 'BSE_LISTED'] }
        }
      ]
    }
  });

  const res = {
    isListed: !!listedCompany,
    exchange: listedCompany?.category || null,
    exactName: listedCompany?.entity_name || null
  };

  await redis.set(key, JSON.stringify(res), 'EX', 60 * 60);
  return res;
}
