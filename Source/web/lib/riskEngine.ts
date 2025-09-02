export type Reason = { id: string; weight: number; snippet?: string; note?: string };

const RED_FLAGS: { id: string; re: RegExp; weight: number }[] = [
  { id: "assured", re: /assured returns?/i, weight: 30 },
  { id: "guaranteed", re: /guaranteed (profit|returns?)/i, weight: 30 },
  { id: "preipo", re: /pre[-\s]?ipo allotment/i, weight: 25 },
  { id: "insider", re: /insider (info|news)/i, weight: 20 },
  { id: "upi", re: /\b\w{2,20}@[a-zA-Z]+\b/i, weight: 15 }, // UPI-like
  { id: "shorteners", re: /(bit\.ly|tinyurl\.com|t\.co|cutt\.ly)/i, weight: 10 },
  { id: "join_groups", re: /join (telegram|whatsapp)/i, weight: 10 },
  { id: "pressurize", re: /\b(hurry|last chance|today only|act now|limited seats)\b/i, weight: 8 }
];

function scoreRules(pitch: string, pct?: number, tf?: string) {
  let score = 0;
  const reasons: Reason[] = [];
  for (const f of RED_FLAGS) {
    const m = pitch.match(f.re);
    if (m) {
      score += f.weight;
      reasons.push({ id: f.id, weight: f.weight, snippet: m[0] });
    }
  }
  if (pct && tf) {
    const short = /day|week|daily|weekly|fortnight|2\s*weeks|month/i.test(tf);
    if (short && pct >= 10) {
      score += 25;
      reasons.push({ id: "high_roi_short", weight: 25, snippet: `${pct}% in ${tf}` });
    }
  }
  const excls = (pitch.match(/[!]{2,}/g) || []).length;
  if (excls) {
    const w = Math.min(5, excls);
    score += w;
    reasons.push({ id: "excl", weight: w, snippet: "exclamation marks" });
  }
  return { score, reasons };
}

export function combineRisk({
  registryFound,
  mlScore,
  rulesScore,
  rulesReasons
}: {
  registryFound: boolean;
  mlScore: number | null;
  rulesScore: number;
  rulesReasons: Reason[];
}) {
  let base = 0;
  const explanations: Reason[] = [];
  if (registryFound) {
    base -= 40;
    explanations.push({ id: "registry_match", weight: -40, note: "Registry match" });
  } else {
    base += 25;
    explanations.push({ id: "registry_missing", weight: 25, note: "No registry match" });
  }
  base += rulesScore;
  explanations.push(...rulesReasons);
  if (mlScore !== null && mlScore !== undefined) {
    const w = Math.round(mlScore * 30);
    base += w;
    explanations.push({ id: "ml", weight: w, note: `ml_score:${mlScore.toFixed(3)}` });
  }
  const risk = Math.max(0, Math.min(100, base));
  const verdict = risk < 30 ? "legit" : "suspicious";
  return { risk: Math.round(risk), verdict, explanations };
}

export function evaluatePitch(pitch_text: string, claimed_return_percent?: number, claimed_timeframe?: string) {
  return scoreRules(pitch_text, claimed_return_percent, claimed_timeframe);
}
