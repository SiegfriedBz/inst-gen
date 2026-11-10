import { defaultAnswerDeps } from '@/lib/brand/deps';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { runAnswer } from '@/lib/questions/answer-run';
import {
  QUESTION_ERROR_STATUS,
  type QuestionErrorCode,
  questionBodySchema,
} from '@/lib/questions/question';
import { GIVE_BACK_CODES, giveBackUsage, takeUsage, usageRefusal } from '@/lib/usage/meter';

// Writes one answer to a guest's question (docs/specs/questions/answer-drafts).
// Reached only with a valid session: proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 60;

const headers = { 'cache-control': 'no-store' };

function fail(code: QuestionErrorCode): Response {
  return Response.json({ error: code }, { status: QUESTION_ERROR_STATUS[code], headers });
}

export async function POST(request: Request): Promise<Response> {
  const ownerId = await getCurrentOwner();
  if (!ownerId) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  let body: ReturnType<typeof questionBodySchema.parse>;
  try {
    body = questionBodySchema.parse(await request.json());
  } catch {
    return fail('invalid_request');
  }
  const usage = await takeUsage({ ownerId, action: 'answers' });
  if (!usage.ok) return usageRefusal(usage.code, usage.resetsAt);
  const out = await runAnswer(body, ownerId, defaultAnswerDeps(), request.signal);
  if (out.ok) return Response.json(out.response, { headers });
  if (GIVE_BACK_CODES.has(out.code)) await giveBackUsage(usage.ticket);
  // Nobody is left to read an answer.
  if (out.code === 'aborted') return new Response(null, { status: 499, headers });
  return fail(out.code);
}
