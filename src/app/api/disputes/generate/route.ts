import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ParsedDocumentDataSchema, DisputeCategoryEnum } from '@/lib/ocr/schemas';
import { compileDisputeLetter } from '@/lib/disputes/engine';
import { CaseRepository } from '@/lib/db/caseRepository';

export const runtime = 'nodejs';

/**
 * Request validation schema for dispute generation.
 */
const GenerateDisputeRequestSchema = z.object({
  caseId: z.string().optional(),
  parsedDoc: ParsedDocumentDataSchema,
  categoryOverride: DisputeCategoryEnum.optional(),
  directives: z
    .object({
      ceasePhoneCalls: z.boolean().optional(),
      demandItemizedLedger: z.boolean().optional(),
      requestChainOfTitle: z.boolean().optional(),
      includeMethodOfVerification: z.boolean().optional(),
      citeStatutoryDamages: z.boolean().optional(),
      includeRegulatoryEscalation: z.boolean().optional(),
      disputeGrounds: z.array(z.string()).optional(),
      customNotes: z.string().optional(),
      certifiedMailNumber: z.string().optional(),
      targetSlaDaysOverride: z.number().int().positive().optional(),
      selectedChargeIds: z.array(z.string()).optional(),
    })
    .optional(),
  senderOverride: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      accountOrReferenceNumber: z.string().optional(),
    })
    .optional(),
  recipientOverride: z
    .object({
      name: z.string().optional(),
      department: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      accountOrReferenceNumber: z.string().optional(),
    })
    .optional(),
  saveToDatabase: z.boolean().default(true).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = GenerateDisputeRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid dispute generation request payload',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      caseId: initialCaseId,
      parsedDoc,
      directives = {},
      senderOverride,
      recipientOverride,
      categoryOverride,
      saveToDatabase = true,
    } = parseResult.data;

    // 1. Compile the formal legal dispute letter
    const compiledLetter = compileDisputeLetter({
      parsedDoc,
      directives: directives as any,
      senderOverride,
      recipientOverride,
      categoryOverride,
    });

    let effectiveCaseId = initialCaseId;
    let savedLetterRecord = null;

    // 2. Persist to SQLite if requested
    if (saveToDatabase) {
      try {
        if (!effectiveCaseId) {
          // Create a new case
          const createdCase = await CaseRepository.createCase({
            title: `Dispute: ${compiledLetter.recipientName}`,
            category: compiledLetter.disputeDomain,
            opponentName: compiledLetter.recipientName,
            opponentAddress: compiledLetter.recipientAddress,
            accountNumber:
              recipientOverride?.accountOrReferenceNumber ||
              parsedDoc.senderOrCreditor.accountOrReferenceNumber,
            disputedAmount: compiledLetter.totalDisputedAmount,
            currency: 'USD',
            statutoryDays: compiledLetter.statutorySlaDays,
          });
          effectiveCaseId = createdCase.id;
        }

        // Attach dispute letter to case
        savedLetterRecord = await CaseRepository.createDisputeLetter(effectiveCaseId, {
          recipientName: compiledLetter.recipientName,
          recipientAddr: compiledLetter.recipientAddress,
          subjectLine: compiledLetter.subjectLine,
          bodyMarkdown: compiledLetter.fullLetterMarkdown,
          legalCitations: JSON.stringify(compiledLetter.legalCitations),
        });
      } catch (dbErr) {
        console.error('Database persistence warning in /api/disputes/generate:', dbErr);
        // Continue and return letter even if DB persistence encounters issue
      }
    }

    return NextResponse.json(
      {
        success: true,
        caseId: effectiveCaseId ?? null,
        disputeLetterId: savedLetterRecord?.id ?? null,
        letter: compiledLetter,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Fatal error in /api/disputes/generate:', error);
    return NextResponse.json(
      {
        error: 'Failed to compile statutory dispute letter',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
