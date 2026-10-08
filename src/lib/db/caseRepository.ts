import { prisma } from './prisma';
import type {
  UserCase,
  Document,
  AuditLineItem,
  DisputeLetter,
  TimelineEvent,
  DisputeCategory,
  DisputeStatus,
  Prisma,
} from '@prisma/client';

export type UserCaseWithRelations = Prisma.UserCaseGetPayload<{
  include: {
    documents: true;
    lineItems: true;
    disputeLetters: true;
    timelineEvents: true;
  };
}>;

export interface CreateCaseDTO {
  title: string;
  category: DisputeCategory;
  opponentName: string;
  opponentAddress?: string | null;
  accountNumber?: string | null;
  disputedAmount?: number | null;
  currency?: string;
  statutoryDays?: number;
  tags?: string[];
}

export interface AddDocumentDTO {
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  ocrRawText?: string | null;
  parsedJson?: string | null;
}

export interface LineItemDTO {
  description: string;
  billedAmount: number;
  fairAmount?: number | null;
  isFlagged?: boolean;
  flagReason?: string | null;
  statuteRef?: string | null;
}

export interface CreateDisputeLetterDTO {
  recipientName: string;
  recipientAddr: string;
  subjectLine: string;
  bodyMarkdown: string;
  legalCitations: string;
  pdfExportPath?: string | null;
}

export interface CreateTimelineEventDTO {
  title: string;
  description: string;
  eventType: string;
}

/**
 * CaseRepository: High-level database abstraction isolating Prisma operations.
 */
export class CaseRepository {
  /**
   * Creates a new UserCase along with an initial lifecycle timeline event.
   */
  static async createCase(dto: CreateCaseDTO): Promise<UserCase> {
    return await prisma.userCase.create({
      data: {
        title: dto.title,
        category: dto.category,
        opponentName: dto.opponentName,
        opponentAddress: dto.opponentAddress ?? null,
        accountNumber: dto.accountNumber ?? null,
        disputedAmount: dto.disputedAmount ?? 0.0,
        currency: dto.currency ?? 'USD',
        statutoryDays: dto.statutoryDays ?? 30,
        timelineEvents: {
          create: {
            title: 'Case Initialized',
            description: `Dispute record created for ${dto.opponentName} under category ${dto.category}.`,
            eventType: 'CASE_CREATED',
          },
        },
      },
    });
  }

  /**
   * Retrieves a case by ID with all associated documents, line items, letters, and timeline events.
   */
  static async getCaseById(id: string): Promise<UserCaseWithRelations | null> {
    return await prisma.userCase.findUnique({
      where: { id },
      include: {
        documents: true,
        lineItems: true,
        disputeLetters: true,
        timelineEvents: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }

  /**
   * Lists all cases with basic relation counts.
   */
  static async listCases(): Promise<UserCase[]> {
    return await prisma.userCase.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Updates case lifecycle status and automatically logs a timeline event.
   */
  static async updateCaseStatus(
    id: string,
    status: DisputeStatus,
    reason?: string
  ): Promise<UserCase> {
    return await prisma.userCase.update({
      where: { id },
      data: {
        status,
        timelineEvents: {
          create: {
            title: `Status Changed to ${status}`,
            description: reason || `Case status shifted to ${status}.`,
            eventType: 'STATUS_UPDATE',
          },
        },
      },
    });
  }

  /**
   * Associates an uploaded or OCR-processed document with an existing case.
   */
  static async addDocument(dto: AddDocumentDTO): Promise<Document> {
    const doc = await prisma.document.create({
      data: {
        caseId: dto.caseId,
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
        filePath: dto.filePath,
        ocrRawText: dto.ocrRawText ?? null,
        parsedJson: dto.parsedJson ?? null,
      },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: dto.caseId,
        title: 'Evidence Document Ingested',
        description: `Attached ${dto.fileName} (${(dto.fileSize / 1024).toFixed(1)} KB).`,
        eventType: 'DOCUMENT_ATTACHED',
      },
    });

    return doc;
  }

  /**
   * Atomically overwrites or sets line items for an audited case.
   */
  static async setLineItems(
    caseId: string,
    items: LineItemDTO[]
  ): Promise<AuditLineItem[]> {
    return await prisma.$transaction(async (tx) => {
      await tx.auditLineItem.deleteMany({
        where: { caseId },
      });

      const created: AuditLineItem[] = [];
      for (const item of items) {
        const line = await tx.auditLineItem.create({
          data: {
            caseId,
            description: item.description,
            billedAmount: item.billedAmount,
            fairAmount: item.fairAmount ?? null,
            isFlagged: item.isFlagged ?? false,
            flagReason: item.flagReason ?? null,
            statuteRef: item.statuteRef ?? null,
          },
        });
        created.push(line);
      }

      await tx.timelineEvent.create({
        data: {
          caseId,
          title: 'Line Items Audited',
          description: `Updated ${items.length} itemized line charges (${items.filter(i => i.isFlagged).length} flagged).`,
          eventType: 'LINE_ITEMS_UPDATED',
        },
      });

      return created;
    });
  }

  /**
   * Persists a newly generated formal dispute demand letter.
   */
  static async addDisputeLetter(
    caseId: string,
    dto: CreateDisputeLetterDTO
  ): Promise<DisputeLetter> {
    const letterCount = await prisma.disputeLetter.count({ where: { caseId } });

    const letter = await prisma.disputeLetter.create({
      data: {
        caseId,
        version: letterCount + 1,
        recipientName: dto.recipientName,
        recipientAddr: dto.recipientAddr,
        subjectLine: dto.subjectLine,
        bodyMarkdown: dto.bodyMarkdown,
        legalCitations: dto.legalCitations,
        pdfExportPath: dto.pdfExportPath ?? null,
      },
    });

    await prisma.userCase.update({
      where: { id: caseId },
      data: { status: 'LETTER_GENERATED' },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId,
        title: `Dispute Letter Draft v${letter.version} Generated`,
        description: `Subject: ${dto.subjectLine}`,
        eventType: 'LETTER_GENERATED',
      },
    });

    return letter;
  }

  /**
   * Alias for addDisputeLetter.
   */
  static async createDisputeLetter(caseId: string, dto: CreateDisputeLetterDTO): Promise<DisputeLetter> {
    return this.addDisputeLetter(caseId, dto);
  }

  /**
   * Deletes a case and cascades all child documents, lines, and timeline events.
   */
  static async deleteCase(id: string): Promise<UserCase> {
    return await prisma.userCase.delete({
      where: { id },
    });
  }
}
