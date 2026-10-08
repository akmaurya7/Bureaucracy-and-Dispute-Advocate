import { prisma } from './prisma';
import type {
  DisputeCategory,
  DisputeStatus,
  UserCase,
  Document,
  AuditLineItem,
  DisputeLetter,
  TimelineEvent,
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
  disputedAmount?: number;
  currency?: string;
  statutoryDays?: number;
}

export interface CreateDocumentDTO {
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  ocrRawText?: string | null;
  parsedJson?: string | null;
}

export interface CreateLineItemDTO {
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
 * Repository pattern implementation for UserCase and related dispute entities.
 * Decouples presentation and business logic from Prisma ORM for maximum testability and scalability.
 */
export class CaseRepository {
  /**
   * Creates a new consumer dispute case.
   */
  static async createCase(dto: CreateCaseDTO): Promise<UserCase> {
    const days = dto.statutoryDays ?? 30;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    return await prisma.userCase.create({
      data: {
        title: dto.title,
        category: dto.category,
        opponentName: dto.opponentName,
        opponentAddress: dto.opponentAddress,
        accountNumber: dto.accountNumber,
        disputedAmount: dto.disputedAmount ?? 0.0,
        currency: dto.currency ?? 'USD',
        statutoryDays: days,
        deadlineDate: deadline,
        timelineEvents: {
          create: {
            title: 'Case Initiated',
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
        disputeLetters: {
          orderBy: { createdAt: 'desc' },
        },
        timelineEvents: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }

  /**
   * Lists all cases ordered by recent activity.
   */
  static async listCases(filter?: { category?: DisputeCategory; status?: DisputeStatus }): Promise<UserCase[]> {
    return await prisma.userCase.findMany({
      where: {
        ...(filter?.category ? { category: filter.category } : {}),
        ...(filter?.status ? { status: filter.status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Updates case lifecycle status and automatically logs a timeline event.
   */
  static async updateCaseStatus(id: string, status: DisputeStatus, notes?: string): Promise<UserCase> {
    return await prisma.userCase.update({
      where: { id },
      data: {
        status,
        timelineEvents: {
          create: {
            title: `Status Changed to ${status}`,
            description: notes ?? `Case status transitioned to ${status}.`,
            eventType: 'STATUS_CHANGE',
          },
        },
      },
    });
  }

  /**
   * Attaches an uploaded or scanned document to a case.
   */
  static async addDocument(dto: CreateDocumentDTO): Promise<Document> {
    const doc = await prisma.document.create({
      data: {
        caseId: dto.caseId,
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
        filePath: dto.filePath,
        ocrRawText: dto.ocrRawText,
        parsedJson: dto.parsedJson,
      },
    });

    await prisma.timelineEvent.create({
      data: {
        caseId: dto.caseId,
        title: 'Document Uploaded',
        description: `Attached ${dto.fileName} (${(dto.fileSize / 1024).toFixed(1)} KB)`,
        eventType: 'DOCUMENT_UPLOADED',
      },
    });

    return doc;
  }

  /**
   * Replaces or appends line items extracted during the statutory audit.
   */
  static async setLineItems(caseId: string, items: CreateLineItemDTO[]): Promise<AuditLineItem[]> {
    // Delete existing line items for clean audit rerun
    await prisma.auditLineItem.deleteMany({
      where: { caseId },
    });

    await prisma.auditLineItem.createMany({
      data: items.map((item) => ({
        caseId,
        description: item.description,
        billedAmount: item.billedAmount,
        fairAmount: item.fairAmount,
        isFlagged: item.isFlagged ?? false,
        flagReason: item.flagReason,
        statuteRef: item.statuteRef,
      })),
    });

    // Update case disputedAmount with sum of flagged items
    const totalDisputed = items
      .filter((i) => i.isFlagged)
      .reduce((sum, item) => sum + item.billedAmount, 0);

    if (totalDisputed > 0) {
      await prisma.userCase.update({
        where: { id: caseId },
        data: { disputedAmount: totalDisputed },
      });
    }

    return await prisma.auditLineItem.findMany({
      where: { caseId },
    });
  }

  /**
   * Adds a newly generated legal dispute letter draft.
   */
  static async addDisputeLetter(caseId: string, dto: CreateDisputeLetterDTO): Promise<DisputeLetter> {
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
        pdfExportPath: dto.pdfExportPath,
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
   * Deletes a case and cascades all child documents, lines, and timeline events.
   */
  static async deleteCase(id: string): Promise<UserCase> {
    return await prisma.userCase.delete({
      where: { id },
    });
  }
}
