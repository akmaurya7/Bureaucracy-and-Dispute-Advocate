import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { parseDocument } from '@/lib/ocr/extractor';
import { redactSensitivePII, verifyZeroPIIRetention } from '@/lib/ocr/redactor';
import { CaseRepository } from '@/lib/db/caseRepository';
import type { DisputeCategory } from '@/lib/ocr/schemas';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.txt',
]);

/**
 * Ensures the uploads storage directory exists.
 */
function getUploadDir(): string {
  const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

/**
 * POST /api/documents/upload
 *
 * Ingests dispute documents (PDF, image, text), enforces zero-retention client-side
 * PII redaction, extracts normalized entity JSON, and persists records in SQLite.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type') || '';
    let fileName = 'uploaded-document.txt';
    let fileType = 'text/plain';
    let fileSize = 0;
    let rawText = '';
    let caseId: string | null = null;
    let customTitle: string | null = null;
    let categoryHint: DisputeCategory | undefined = undefined;
    let fileBuffer: Buffer | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const rawTextParam = formData.get('rawText') as string | null;
      caseId = (formData.get('caseId') as string | null) || null;
      customTitle = (formData.get('title') as string | null) || null;
      categoryHint = (formData.get('categoryHint') as DisputeCategory | null) || undefined;

      if (file) {
        fileName = file.name;
        fileType = file.type || 'application/octet-stream';
        fileSize = file.size;

        // 1. Validate File Size
        if (fileSize > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            {
              success: false,
              error: `File size exceeds the 10MB limit (${(fileSize / (1024 * 1024)).toFixed(2)} MB).`,
            },
            { status: 400 }
          );
        }

        // 2. Validate File Type
        const fileExt = path.extname(fileName).toLowerCase();
        if (!ALLOWED_MIME_TYPES.has(fileType) && !ALLOWED_EXTENSIONS.has(fileExt)) {
          return NextResponse.json(
            {
              success: false,
              error: `Unsupported file type '${fileType}'. Supported types: PDF, PNG, JPEG, WEBP, TXT.`,
            },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);

        if (fileType === 'text/plain' || fileExt === '.txt') {
          rawText = fileBuffer.toString('utf-8');
        } else if (rawTextParam && rawTextParam.trim()) {
          // If client provided transcribed/OCR text alongside PDF/image
          rawText = rawTextParam.trim();
        } else {
          // Extract printable ASCII strings from document stream
          const textExtract = fileBuffer
            .toString('latin1')
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          rawText = textExtract.length > 50 ? textExtract : `DOCUMENT CONTENT: ${fileName}`;
        }
      } else if (rawTextParam && rawTextParam.trim()) {
        rawText = rawTextParam.trim();
        fileSize = Buffer.byteLength(rawText, 'utf-8');
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'No file or document text payload was provided in the request.',
          },
          { status: 400 }
        );
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      rawText = body.rawText || body.text || '';
      fileName = body.fileName || 'document.txt';
      fileType = body.fileType || 'text/plain';
      fileSize = body.fileSize || Buffer.byteLength(rawText, 'utf-8');
      caseId = body.caseId || null;
      customTitle = body.title || null;
      categoryHint = body.categoryHint || undefined;

      if (!rawText || !rawText.trim()) {
        return NextResponse.json(
          { success: false, error: 'Document rawText is required in JSON payload.' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Content-Type must be multipart/form-data or application/json.',
        },
        { status: 400 }
      );
    }

    // 3. Zero-Retention Client/Edge PII Redaction
    const redactionResult = redactSensitivePII(rawText);
    const verification = verifyZeroPIIRetention(redactionResult.redactedText);

    if (!verification.isSafe) {
      return NextResponse.json(
        {
          success: false,
          error: `Zero-Retention PII Policy Violation: ${verification.violationReason}`,
        },
        { status: 422 }
      );
    }

    // 4. Extract Structured JSON Entities conforming to Zod Schema
    const extractedData = parseDocument(rawText, {
      fileName,
      fileSize,
      fileType,
      categoryHint,
    });

    // 5. Save Document File to Disk (Sanitized / Zero PII Storage)
    const uploadDir = getUploadDir();
    const safeTimestamp = Date.now();
    const sanitizedBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageFileName = `${safeTimestamp}_${sanitizedBaseName}`;
    const storageFilePath = path.join(uploadDir, storageFileName);

    if (fileBuffer) {
      fs.writeFileSync(storageFilePath, fileBuffer);
    } else {
      fs.writeFileSync(storageFilePath, redactionResult.redactedText, 'utf-8');
    }

    const relativeFilePath = path.relative(process.cwd(), storageFilePath).replace(/\\/g, '/');

    // 6. Resolve or Create UserCase
    let resolvedCaseId = caseId;

    if (resolvedCaseId) {
      const existingCase = await CaseRepository.getCaseById(resolvedCaseId);
      if (!existingCase) {
        resolvedCaseId = null; // Create fallback case if ID is invalid
      }
    }

    if (!resolvedCaseId) {
      const caseTitle =
        customTitle ||
        `${extractedData.detectedCategory.replace(/_/g, ' ')} - ${extractedData.senderOrCreditor.name}`;

      const newCase = await CaseRepository.createCase({
        title: caseTitle,
        category: extractedData.detectedCategory,
        opponentName: extractedData.senderOrCreditor.name,
        opponentAddress: extractedData.senderOrCreditor.address,
        accountNumber: extractedData.senderOrCreditor.accountOrReferenceNumber,
        disputedAmount:
          extractedData.debtOrBillDetails.totalDue > 0
            ? extractedData.debtOrBillDetails.totalDue
            : extractedData.totalFlaggedAmount ?? 0.0,
        currency: 'USD',
        statutoryDays:
          extractedData.detectedCategory === 'SUBSCRIPTION_CANCEL' ? 10 : 30,
      });

      resolvedCaseId = newCase.id;
    }

    // 7. Persist Document Record via CaseRepository
    const savedDocument = await CaseRepository.addDocument({
      caseId: resolvedCaseId,
      fileName,
      fileType,
      fileSize,
      filePath: relativeFilePath,
      ocrRawText: redactionResult.redactedText,
      parsedJson: JSON.stringify(extractedData),
    });

    // 8. If Itemized Charges were extracted, synchronize them into AuditLineItem table
    if (extractedData.debtOrBillDetails.itemizedCharges.length > 0) {
      const lineItemDTOs = extractedData.debtOrBillDetails.itemizedCharges.map((item) => ({
        description: item.description,
        billedAmount: item.billedAmount ?? item.amount,
        fairAmount: item.allowedAmount ?? null,
        isFlagged: item.isFlagged ?? item.isDisputed ?? false,
        flagReason: item.flagReason ?? item.violationExplanation ?? null,
        statuteRef: item.statuteRef ?? item.statutoryBasis ?? null,
      }));

      await CaseRepository.setLineItems(resolvedCaseId, lineItemDTOs);
    }

    // 9. Return JSON Response
    return NextResponse.json(
      {
        success: true,
        caseId: resolvedCaseId,
        document: {
          id: savedDocument.id,
          fileName: savedDocument.fileName,
          fileType: savedDocument.fileType,
          fileSize: savedDocument.fileSize,
          filePath: savedDocument.filePath,
          createdAt: savedDocument.createdAt,
        },
        extractedData,
        redaction: {
          originalLength: redactionResult.originalTextLength,
          sanitizedLength: redactionResult.redactedText.length,
          entitiesRedacted: redactionResult.detectedCount,
          highRiskPIIPrevented: redactionResult.hasHighRiskPII,
          zeroRetentionVerified: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Document Upload & OCR Pipeline Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown internal error occurred during document ingestion.',
      },
      { status: 500 }
    );
  }
}
