import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import { evaluatePitch, combineRisk } from '@/lib/riskEngine';
import { lookupRegistry } from '@/lib/registry';
import { prisma } from '@/lib/prisma';

const submissionSchema = z.object({
  advisor_name: z.string().min(1).optional(),
  advisor_email: z.string().email().optional(),
  advisor_phone: z.string().optional(),
  claimed_sebi_reg_no: z.string().optional(),
  claimed_return_percent: z.number().min(0).max(10000).optional(),
  claimed_timeframe: z.string().optional(),
  pitch_text: z.string().min(5),
  urls: z.array(z.string().url()).optional()
});

function cors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      return cors(NextResponse.json({ error: parsed.error }, { status: 400 }));
    }
    const p = parsed.data;

    // 1) Registry
    const registry = await lookupRegistry(p.claimed_sebi_reg_no, p.advisor_name);

    // 2) ML
    let mlScore: number | null = null;
    try {
      const mlURL = process.env.ML_SERVICE_URL || 'http://localhost:8001/score';
      const r = await axios.post(mlURL, { text: p.pitch_text });
      mlScore = r.data?.ml_score ?? null;
    } catch {
      mlScore = null;
    }

    // 3) Rules
    const rules = evaluatePitch(p.pitch_text, p.claimed_return_percent, p.claimed_timeframe);

    // 4) Combine
    const combined = combineRisk({
      registryFound: !!registry.found,
      mlScore,
      rulesScore: rules.score,
      rulesReasons: rules.reasons
    });

    // 5) Persist
    await prisma.submission.create({
      data: {
        advisor_name: p.advisor_name,
        advisor_email: p.advisor_email,
        advisor_phone: p.advisor_phone,
        claimed_sebi_reg_no: p.claimed_sebi_reg_no,
        claimed_return_percent: p.claimed_return_percent,
        claimed_timeframe: p.claimed_timeframe,
        pitch_text: p.pitch_text,
        urls: p.urls ?? [],
        risk_score: combined.risk,
        verdict: combined.verdict,
        explanations: combined.explanations
      }
    });

    // 6) Response
    const res = NextResponse.json({
      risk_score: combined.risk,
      verdict: combined.verdict,
      explanations: combined.explanations,
      registry: {
        found: registry.found,
        entity_name: registry.entry?.entity_name ?? null,
        reg_no: registry.entry?.reg_no ?? p.claimed_sebi_reg_no ?? null,
        matchConf: registry.matchConf ?? null
      }
    });
    return cors(res);
  } catch (e: any) {
    return cors(NextResponse.json({ error: e?.message || 'server error' }, { status: 500 }));
  }
}
