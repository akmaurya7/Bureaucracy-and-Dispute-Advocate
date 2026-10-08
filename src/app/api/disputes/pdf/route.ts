import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CaseRepository } from '@/lib/db/caseRepository';
import { generateCourtReadyPdf } from '@/lib/pdf/generator';
import type { CompiledDisputeLetter } from '@/lib/disputes/types';
import { getGoverningStatuteForCategory } from '@/lib/disputes/engine';
import type { DisputeCategory } from '@/lib/ocr/schemas';

export const runtime = 'nodejs';

const GeneratePdfRequestSchema = z.object({
  letterId: z.string().optional(),
  letter: z
    .object({
      subjectLine: z.string(),
      recipientName: z.string(),
      recipientAddress: z.string(),
      bodyMarkdown: z.string(),
      fullLetterMarkdown: z.string().optional(),
      legalCitations: z.array(z.string()).default([]),
      statutorySlaDays: z.number().default(30),
      statutoryDeadlineDate: z.string(),
      disputeDomain: z.string(),
      totalDisputedAmount: z.number().default(0),
      disputedLineItemsCount: z.number().default(0),
      disputedCharges: z.array(z.any()).default([]),
      escalationAgencies: z.array(z.string()).default([]),
      trackingNumber: z.string(),
      generatedAt: z.string().default(new Date().toISOString()),
      directivesApplied: z.record(z.any()).default({}),
      governingStatute: z
        .object({
          code: z.string(),
          name: z.string(),
          summary: z.string(),
          statutoryResponseDays: z.number(),
          timeUnit: z.enum(['business_days', 'calendar_days']),
          regulatoryAgencies: z.array(z.string()),
        })
        .optional(),
    })
    .optional(),
  options: z
    .object({
      includeCertifiedMailHeader: z.boolean().optional(),
      signerNameOverride: z.string().optional(),
      signerTitleOverride: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = GeneratePdfRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid PDF export request payload',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { letterId, letter: inputLetter, options = {} } = parseResult.data;

    let targetLetter: CompiledDisputeLetter;
    let associatedCaseId: string | null = null;
    let accountNumber = 'RECORD';

    if (letterId) {
      // 1. Fetch existing letter record from SQLite
      const dbLetter = await CaseRepository.getDisputeLetterById(letterId);
      if (!dbLetter) {
        return NextResponse.json(
          { error: `Dispute letter with ID '${letterId}' not found.` },
          { status: 404 }
        );
      }

      associatedCaseId = dbLetter.caseId;
      const userCase = (dbLetter as any).userCase;
      if (userCase?.accountNumber) {
        accountNumber = userCase.accountNumber;
      }

      // Parse citations if stored as JSON string
      let parsedCitations: string[] = [];
      try {
        parsedCitations = JSON.parse(dbLetter.legalCitations);
      } catch {
        parsedCitations = dbLetter.legalCitations ? [dbLetter.legalCitations] : [];
      }

      // Extract tracking number if present in markdown, else generate standard certified tracking
      const trackingMatch = dbLetter.bodyMarkdown.match(/CERTIFIED MAIL (?:TRACKING|RECEIPT) #:\s*([A-Za-z0-9 -]+)/i);
      const trackingNumber = trackingMatch
        ? trackingMatch[1].trim()
        : `7020 0640 0001 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;

      const domain = (userCase?.category as DisputeCategory) || 'DEBT_COLLECTION';
      const governingStatute = getGoverningStatuteForCategory(domain);

      targetLetter = {
        id: dbLetter.id,
        caseId: dbLetter.caseId,
        subjectLine: dbLetter.subjectLine,
        recipientName: dbLetter.recipientName,
        recipientAddress: dbLetter.recipientAddr,
        bodyMarkdown: dbLetter.bodyMarkdown,
        fullLetterMarkdown: dbLetter.bodyMarkdown,
        legalCitations: parsedCitations,
        statutorySlaDays: userCase?.statutoryDays || governingStatute.statutoryResponseDays,
        statutoryDeadlineDate: userCase?.deadlineDate
          ? new Date(userCase.deadlineDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
        disputeDomain: domain,
        governingStatute,
        totalDisputedAmount: userCase?.disputedAmount || 0,
        disputedLineItemsCount: 0,
        disputedCharges: [],
        escalationAgencies: governingStatute.regulatoryAgencies,
        trackingNumber,
        generatedAt: dbLetter.createdAt.toISOString(),
        directivesApplied: {},
      };
    } else if (inputLetter) {
      // 2. Use directly provided dispute letter JSON
      const domain = inputLetter.disputeDomain as DisputeCategory;
      const governingStatute = inputLetter.governingStatute || getGoverningStatuteForCategory(domain);

      targetLetter = {
        ...inputLetter,
        disputeDomain: domain,
        fullLetterMarkdown: inputLetter.fullLetterMarkdown || inputLetter.bodyMarkdown,
        governingStatute,
      } as CompiledDisputeLetter;
    } else {
      return NextResponse.json(
        { error: 'Either letterId or letter object must be provided.' },
        { status: 400 }
      );
    }

    // 3. Generate binary PDF using pure-JS pdf-lib engine
    const pdfBytes = await generateCourtReadyPdf(targetLetter, options);

    // 4. Record timeline event in SQLite if case is linked
    if (associatedCaseId) {
      try {
        await CaseRepository.addTimelineEvent(associatedCaseId, {
          title: 'Court-Ready Legal PDF Exported',
          description: `Generated USPS Certified Mail dispute PDF (${pdfBytes.byteLength} bytes) for ${targetLetter.recipientName}.`,
          eventType: 'PDF_EXPORTED',
        });
      } catch (timelineErr) {
        console.warn('Could not record PDF_EXPORTED timeline event:', timelineErr);
      }
    }

    // 5. Build sanitized attachment filename
    const safeDomain = (targetLetter.disputeDomain || 'dispute').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const safeAccount = accountNumber.replace(/[^a-z0-9_-]/g, '_');
    const filename = `dispute-letter-${safeDomain}-${safeAccount}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBytes.byteLength.toString(),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Fatal error in /api/disputes/pdf:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate court-ready dispute PDF',
        message: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
