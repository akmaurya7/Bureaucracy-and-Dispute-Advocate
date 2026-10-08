import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB, PDFName, PDFString } from 'pdf-lib';
import type { CompiledDisputeLetter } from '../disputes/types';
import type { ItemizedCharge } from '../ocr/schemas';

// Standard 8.5" x 11" US Letter dimensions in points (72 points/inch)
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 54; // 0.75 inch = 54 points
export const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 504 points
export const BOTTOM_LIMIT = 60; // Leave room for page footer

// Legal color palette
const COLOR_PRIMARY = rgb(0.08, 0.14, 0.22); // Deep navy slate
const COLOR_SECONDARY = rgb(0.25, 0.32, 0.4); // Slate grey
const COLOR_MUTED = rgb(0.45, 0.5, 0.58); // Muted grey
const COLOR_BORDER = rgb(0.82, 0.85, 0.89); // Border grey
const COLOR_BG_LIGHT = rgb(0.96, 0.97, 0.98); // Light card background
const COLOR_POSTAL_GREEN = rgb(0.05, 0.42, 0.22); // Postal certified green
const COLOR_ALERT_RED = rgb(0.72, 0.12, 0.12); // Alert red
const COLOR_WHITE = rgb(1, 1, 1);

export interface PdfGeneratorOptions {
  includeCertifiedMailHeader?: boolean;
  signerNameOverride?: string;
  signerTitleOverride?: string;
  includeCertificateOfService?: boolean;
}

export interface CourtReadyDisputePdfParams {
  letter: CompiledDisputeLetter;
  trackingNumber?: string;
  options?: PdfGeneratorOptions;
}

/**
 * Normalizes text to ensure safe WinAnsi encoding in PDF standard fonts.
 */
function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/\t/g, '    ');
}

/**
 * Splits text into lines fitting within maxWidth points.
 */
function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number
): string[] {
  const sanitized = sanitizeText(text);
  const words = sanitized.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);

    if (width <= maxWidth) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

/**
 * Internal state for tracking multi-page coordinates.
 */
class DocumentLayoutEngine {
  doc: PDFDocument;
  pages: PDFPage[] = [];
  currentPage: PDFPage;
  currentY: number;
  regularFont: PDFFont;
  boldFont: PDFFont;
  obliqueFont: PDFFont;
  monoFont: PDFFont;
  trackingNumber: string;
  subjectLine: string;

  constructor(
    doc: PDFDocument,
    fonts: {
      regular: PDFFont;
      bold: PDFFont;
      oblique: PDFFont;
      mono: PDFFont;
    },
    trackingNumber: string,
    subjectLine: string
  ) {
    this.doc = doc;
    this.regularFont = fonts.regular;
    this.boldFont = fonts.bold;
    this.obliqueFont = fonts.oblique;
    this.monoFont = fonts.mono;
    this.trackingNumber = trackingNumber;
    this.subjectLine = subjectLine;

    this.currentPage = this.addNewPage();
    this.currentY = PAGE_HEIGHT - MARGIN;
  }

  addNewPage(): PDFPage {
    const page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(page);
    this.currentPage = page;
    this.currentY = PAGE_HEIGHT - MARGIN;

    // If page 2+, render running top header
    if (this.pages.length > 1) {
      this.drawRunningHeader();
    }

    return page;
  }

  ensureSpace(heightNeeded: number) {
    if (this.currentY - heightNeeded < BOTTOM_LIMIT) {
      this.addNewPage();
    }
  }

  drawRunningHeader() {
    const pageNum = this.pages.length;
    this.currentPage.drawText(
      sanitizeText(`FORMAL DISPUTE DEMAND — ${this.trackingNumber}`),
      {
        x: MARGIN,
        y: PAGE_HEIGHT - 36,
        size: 8,
        font: this.boldFont,
        color: COLOR_MUTED,
      }
    );

    const rightText = sanitizeText(`PAGE ${pageNum}`);
    const rightWidth = this.boldFont.widthOfTextAtSize(rightText, 8);
    this.currentPage.drawText(rightText, {
      x: PAGE_WIDTH - MARGIN - rightWidth,
      y: PAGE_HEIGHT - 36,
      size: 8,
      font: this.boldFont,
      color: COLOR_MUTED,
    });

    this.currentPage.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 42 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 42 },
      thickness: 0.5,
      color: COLOR_BORDER,
    });

    this.currentY = PAGE_HEIGHT - MARGIN - 10;
  }

  /**
   * Draws a standardized USPS Certified Mail tracking header banner with barcode.
   */
  drawCertifiedMailHeader(trackingNumber: string) {
    const headerHeight = 72;
    this.ensureSpace(headerHeight + 15);

    const startY = this.currentY - headerHeight;

    // Background container
    this.currentPage.drawRectangle({
      x: MARGIN,
      y: startY,
      width: USABLE_WIDTH,
      height: headerHeight,
      color: COLOR_BG_LIGHT,
      borderColor: COLOR_POSTAL_GREEN,
      borderWidth: 1.5,
    });

    // Top banner strip (Postal Green)
    const topBarHeight = 18;
    this.currentPage.drawRectangle({
      x: MARGIN,
      y: startY + headerHeight - topBarHeight,
      width: USABLE_WIDTH,
      height: topBarHeight,
      color: COLOR_POSTAL_GREEN,
    });

    // Top banner text
    this.currentPage.drawText('USPS CERTIFIED MAIL™', {
      x: MARGIN + 12,
      y: startY + headerHeight - topBarHeight + 5,
      size: 9,
      font: this.boldFont,
      color: COLOR_WHITE,
    });

    const receiptNotice = 'RETURN RECEIPT REQUESTED';
    const noticeWidth = this.boldFont.widthOfTextAtSize(receiptNotice, 8.5);
    this.currentPage.drawText(receiptNotice, {
      x: PAGE_WIDTH - MARGIN - 12 - noticeWidth,
      y: startY + headerHeight - topBarHeight + 5,
      size: 8.5,
      font: this.boldFont,
      color: COLOR_WHITE,
    });

    // Barcode container and simulated USPS barcode lines
    const barcodeY = startY + 22;
    const barcodeX = MARGIN + 16;
    const barcodeWidth = USABLE_WIDTH - 32;

    // Draw simulated vertical barcode stripes
    const barPattern = [
      2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 2, 1, 3, 1, 2, 4, 1, 2,
      1, 3, 1, 2, 2, 1, 4, 2, 1, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 1, 2, 2,
      1, 3, 1, 4, 2, 1, 2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1,
      2, 4, 1, 2, 2, 1, 3, 1, 1, 4, 2, 1, 2, 3, 1, 2, 1, 4, 1, 2, 3, 1, 1, 2, 4,
      1, 3, 2, 1, 1, 4, 2, 1, 2, 1, 3, 1, 2, 4, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 2,
      2, 1, 4, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 2, 1, 3, 1, 1, 4, 2,
    ];

    let currentBarX = barcodeX + 4;
    const barcodeHeight = 16;
    for (let i = 0; i < barPattern.length && currentBarX < barcodeX + barcodeWidth - 10; i++) {
      const barThick = barPattern[i] > 2 ? 1.8 : 0.8;
      this.currentPage.drawRectangle({
        x: currentBarX,
        y: barcodeY,
        width: barThick,
        height: barcodeHeight,
        color: COLOR_PRIMARY,
      });
      currentBarX += barPattern[i] + 1.2;
    }

    // Centered tracking number text below barcode
    const trackLabel = `ARTICLE NUMBER: ${trackingNumber}`;
    const trackWidth = this.monoFont.widthOfTextAtSize(trackLabel, 9);
    this.currentPage.drawText(trackLabel, {
      x: MARGIN + (USABLE_WIDTH - trackWidth) / 2,
      y: startY + 6,
      size: 9,
      font: this.monoFont,
      color: COLOR_PRIMARY,
    });

    this.currentY = startY - 14;
  }

  /**
   * Draws date, transmission channel, and formal From/To party blocks.
   */
  drawPartiesAndDate(data: {
    date: string;
    senderName: string;
    senderAddress: string;
    recipientName: string;
    recipientAddress: string;
  }) {
    this.ensureSpace(110);

    // Date & Certified Transmission line
    this.currentPage.drawText(`DATE: ${sanitizeText(data.date)}`, {
      x: MARGIN,
      y: this.currentY,
      size: 9.5,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    const viaText = 'SENT VIA: USPS Certified Mail / Return Receipt Requested';
    const viaWidth = this.obliqueFont.widthOfTextAtSize(viaText, 8.5);
    this.currentPage.drawText(viaText, {
      x: PAGE_WIDTH - MARGIN - viaWidth,
      y: this.currentY,
      size: 8.5,
      font: this.obliqueFont,
      color: COLOR_SECONDARY,
    });

    this.currentY -= 18;

    // Two-column layout for FROM / TO
    const colWidth = (USABLE_WIDTH - 20) / 2;
    const startY = this.currentY;

    // Box 1: FROM (Consumer)
    this.currentPage.drawRectangle({
      x: MARGIN,
      y: startY - 70,
      width: colWidth,
      height: 70,
      color: COLOR_BG_LIGHT,
      borderColor: COLOR_BORDER,
      borderWidth: 0.8,
    });

    this.currentPage.drawText('FROM (CONSUMER / DISPUTING PARTY):', {
      x: MARGIN + 8,
      y: startY - 14,
      size: 7.5,
      font: this.boldFont,
      color: COLOR_MUTED,
    });

    this.currentPage.drawText(sanitizeText(data.senderName), {
      x: MARGIN + 8,
      y: startY - 28,
      size: 9.5,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    const senderAddrLines = wrapText(data.senderAddress, colWidth - 16, this.regularFont, 8.5);
    let sY = startY - 42;
    for (const line of senderAddrLines.slice(0, 2)) {
      this.currentPage.drawText(line, {
        x: MARGIN + 8,
        y: sY,
        size: 8.5,
        font: this.regularFont,
        color: COLOR_SECONDARY,
      });
      sY -= 11;
    }

    // Box 2: TO (Creditor / Collector / Agency)
    const rightX = MARGIN + colWidth + 20;
    this.currentPage.drawRectangle({
      x: rightX,
      y: startY - 70,
      width: colWidth,
      height: 70,
      color: COLOR_BG_LIGHT,
      borderColor: COLOR_BORDER,
      borderWidth: 0.8,
    });

    this.currentPage.drawText('TO (RESPONDENT / COMPLIANCE DEPT):', {
      x: rightX + 8,
      y: startY - 14,
      size: 7.5,
      font: this.boldFont,
      color: COLOR_MUTED,
    });

    this.currentPage.drawText(sanitizeText(data.recipientName), {
      x: rightX + 8,
      y: startY - 28,
      size: 9.5,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    const recipientAddrLines = wrapText(data.recipientAddress, colWidth - 16, this.regularFont, 8.5);
    let rY = startY - 42;
    for (const line of recipientAddrLines.slice(0, 2)) {
      this.currentPage.drawText(line, {
        x: rightX + 8,
        y: rY,
        size: 8.5,
        font: this.regularFont,
        color: COLOR_SECONDARY,
      });
      rY -= 11;
    }

    this.currentY = startY - 82;
  }

  /**
   * Draws the formal RE: caption and legal summary box.
   */
  drawSubjectBlock(data: {
    subjectLine: string;
    disputeDomain: string;
    statutoryDeadlineDate: string;
    statutorySlaDays: number;
    totalDisputedAmount: number;
  }) {
    this.ensureSpace(58);

    const boxHeight = 52;
    const startY = this.currentY - boxHeight;

    this.currentPage.drawRectangle({
      x: MARGIN,
      y: startY,
      width: USABLE_WIDTH,
      height: boxHeight,
      color: COLOR_WHITE,
      borderColor: COLOR_PRIMARY,
      borderWidth: 1.2,
    });

    // Subject Line
    const subjectWrapped = wrapText(data.subjectLine, USABLE_WIDTH - 20, this.boldFont, 9.5);
    let lineY = startY + boxHeight - 14;
    for (const line of subjectWrapped.slice(0, 2)) {
      this.currentPage.drawText(line, {
        x: MARGIN + 10,
        y: lineY,
        size: 9.5,
        font: this.boldFont,
        color: COLOR_PRIMARY,
      });
      lineY -= 12;
    }

    // Summary metadata row
    const domainText = `DOMAIN: ${data.disputeDomain}`;
    const amountText = `DISPUTED AMOUNT: $${data.totalDisputedAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
    })}`;
    const deadlineText = `MANDATORY RESPONSE DEADLINE: ${data.statutoryDeadlineDate} (${data.statutorySlaDays} Days)`;

    this.currentPage.drawText(domainText, {
      x: MARGIN + 10,
      y: startY + 8,
      size: 7.5,
      font: this.boldFont,
      color: COLOR_SECONDARY,
    });

    this.currentPage.drawText(amountText, {
      x: MARGIN + 150,
      y: startY + 8,
      size: 7.5,
      font: this.boldFont,
      color: COLOR_ALERT_RED,
    });

    const deadWidth = this.boldFont.widthOfTextAtSize(deadlineText, 7.5);
    this.currentPage.drawText(deadlineText, {
      x: PAGE_WIDTH - MARGIN - 10 - deadWidth,
      y: startY + 8,
      size: 7.5,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    this.currentY = startY - 14;
  }

  /**
   * Draws a formal legal section title.
   */
  drawSectionHeading(title: string) {
    this.ensureSpace(34);
    this.currentY -= 6;

    this.currentPage.drawText(sanitizeText(title.toUpperCase()), {
      x: MARGIN,
      y: this.currentY,
      size: 10,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    this.currentPage.drawLine({
      start: { x: MARGIN, y: this.currentY - 4 },
      end: { x: PAGE_WIDTH - MARGIN, y: this.currentY - 4 },
      thickness: 0.8,
      color: COLOR_SECONDARY,
    });

    this.currentY -= 16;
  }

  /**
   * Draws paragraph text with word wrap.
   */
  drawParagraph(text: string, options?: { fontSize?: number; isBold?: boolean; color?: RGB }) {
    const fontSize = options?.fontSize ?? 9;
    const font = options?.isBold ? this.boldFont : this.regularFont;
    const color = options?.color ?? COLOR_PRIMARY;
    const lineHeight = fontSize + 3.5;

    const lines = wrapText(text, USABLE_WIDTH, font, fontSize);

    for (const line of lines) {
      this.ensureSpace(lineHeight + 4);
      this.currentPage.drawText(line, {
        x: MARGIN,
        y: this.currentY,
        size: fontSize,
        font,
        color,
      });
      this.currentY -= lineHeight;
    }

    this.currentY -= 4; // Paragraph gap
  }

  /**
   * Draws an indented bullet point.
   */
  drawBulletPoint(prefix: string, text: string) {
    const fontSize = 8.5;
    const indent = 22;
    const lineHeight = fontSize + 3;

    const wrappedLines = wrapText(text, USABLE_WIDTH - indent, this.regularFont, fontSize);
    this.ensureSpace((wrappedLines.length + 1) * lineHeight);

    // Draw prefix / bullet
    this.currentPage.drawText(prefix, {
      x: MARGIN + 4,
      y: this.currentY,
      size: fontSize,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    // Draw lines indented
    let first = true;
    for (const line of wrappedLines) {
      if (!first) {
        this.ensureSpace(lineHeight + 2);
      }
      this.currentPage.drawText(line, {
        x: MARGIN + indent,
        y: this.currentY,
        size: fontSize,
        font: this.regularFont,
        color: COLOR_PRIMARY,
      });
      this.currentY -= lineHeight;
      first = false;
    }

    this.currentY -= 2;
  }

  /**
   * Draws a clean table for itemized charges and procedural coding anomalies.
   */
  drawItemizedChargesTable(charges: ItemizedCharge[]) {
    if (!charges || charges.length === 0) return;

    this.ensureSpace(60);
    this.drawSectionHeading('Itemized Charges & Statutory Coding Discrepancies');

    // Column widths: [Code/Type: 70pt, Description: 174pt, Disputed: 80pt, Ground/Violation: 180pt]
    const colWidths = [70, 174, 80, 180];
    const colX = [
      MARGIN,
      MARGIN + colWidths[0],
      MARGIN + colWidths[0] + colWidths[1],
      MARGIN + colWidths[0] + colWidths[1] + colWidths[2],
    ];

    const headerHeight = 16;
    this.ensureSpace(headerHeight + 20);

    // Table Header Row
    this.currentPage.drawRectangle({
      x: MARGIN,
      y: this.currentY - headerHeight,
      width: USABLE_WIDTH,
      height: headerHeight,
      color: COLOR_PRIMARY,
    });

    const headers = ['CODE / TYPE', 'DESCRIPTION', 'DISPUTED ($)', 'STATUTORY GROUND / VIOLATION'];
    for (let i = 0; i < headers.length; i++) {
      this.currentPage.drawText(headers[i], {
        x: colX[i] + 4,
        y: this.currentY - headerHeight + 4.5,
        size: 7,
        font: this.boldFont,
        color: COLOR_WHITE,
      });
    }

    this.currentY -= headerHeight;

    // Table Data Rows
    for (let r = 0; r < charges.length; r++) {
      const charge = charges[r];
      const rowHeight = 20;
      this.ensureSpace(rowHeight + 10);

      const isEven = r % 2 === 0;
      if (isEven) {
        this.currentPage.drawRectangle({
          x: MARGIN,
          y: this.currentY - rowHeight,
          width: USABLE_WIDTH,
          height: rowHeight,
          color: COLOR_BG_LIGHT,
        });
      }

      this.currentPage.drawLine({
        start: { x: MARGIN, y: this.currentY - rowHeight },
        end: { x: PAGE_WIDTH - MARGIN, y: this.currentY - rowHeight },
        thickness: 0.5,
        color: COLOR_BORDER,
      });

      const codeStr = charge.code ? `${charge.code} (${charge.codeType || 'CPT'})` : charge.codeType || 'ITEM';
      const descStr = charge.description.length > 30 ? charge.description.substring(0, 30) + '...' : charge.description;
      const amtStr = `$${(charge.amount || charge.billedAmount || 0).toFixed(2)}`;
      const reasonStr = (charge.violationExplanation || charge.flagReason || 'Unsubstantiated surcharge').substring(0, 38);

      this.currentPage.drawText(sanitizeText(codeStr), {
        x: colX[0] + 4,
        y: this.currentY - 13,
        size: 7.5,
        font: this.boldFont,
        color: COLOR_PRIMARY,
      });

      this.currentPage.drawText(sanitizeText(descStr), {
        x: colX[1] + 4,
        y: this.currentY - 13,
        size: 7.5,
        font: this.regularFont,
        color: COLOR_SECONDARY,
      });

      this.currentPage.drawText(amtStr, {
        x: colX[2] + 4,
        y: this.currentY - 13,
        size: 7.5,
        font: this.boldFont,
        color: COLOR_ALERT_RED,
      });

      this.currentPage.drawText(sanitizeText(reasonStr), {
        x: colX[3] + 4,
        y: this.currentY - 13,
        size: 7,
        font: this.regularFont,
        color: COLOR_PRIMARY,
      });

      this.currentY -= rowHeight;
    }

    this.currentY -= 12;
  }

  /**
   * Draws a formal Statutory Authorities and Codified Citations index.
   */
  drawStatutoryAuthoritiesIndex(citations: string[]) {
    if (!citations || citations.length === 0) return;

    this.ensureSpace(50 + citations.length * 12);
    this.drawSectionHeading('Statutory Authorities & Codified Legal Citations');

    const boxHeight = 24 + citations.length * 12;
    const startY = this.currentY - boxHeight;

    this.currentPage.drawRectangle({
      x: MARGIN,
      y: startY,
      width: USABLE_WIDTH,
      height: boxHeight,
      color: COLOR_BG_LIGHT,
      borderColor: COLOR_BORDER,
      borderWidth: 0.8,
    });

    this.currentPage.drawText('GOVERNING FEDERAL STATUTES & REGULATORY CODES:', {
      x: MARGIN + 10,
      y: startY + boxHeight - 12,
      size: 7.5,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    let citeY = startY + boxHeight - 24;
    for (const cite of citations) {
      this.currentPage.drawText(`§  ${sanitizeText(cite)}`, {
        x: MARGIN + 14,
        y: citeY,
        size: 7.5,
        font: this.regularFont,
        color: COLOR_SECONDARY,
      });
      citeY -= 12;
    }

    this.currentY = startY - 14;
  }

  /**
   * Draws a formal Regulatory Escalation Alert Container.
   */
  drawRegulatoryAlertBox(agencies: string[], deadlineDate: string, slaDays: number) {
    const boxHeight = 48 + agencies.length * 11;
    this.ensureSpace(boxHeight + 15);

    const startY = this.currentY - boxHeight;

    this.currentPage.drawRectangle({
      x: MARGIN,
      y: startY,
      width: USABLE_WIDTH,
      height: boxHeight,
      color: COLOR_BG_LIGHT,
      borderColor: COLOR_ALERT_RED,
      borderWidth: 1.2,
    });

    this.currentPage.drawText('NOTICE OF MANDATORY REGULATORY ESCALATION UPON EXPIRATION:', {
      x: MARGIN + 10,
      y: startY + boxHeight - 14,
      size: 8,
      font: this.boldFont,
      color: COLOR_ALERT_RED,
    });

    const warningText = `If valid statutory compliance is not established within ${slaDays} days (by ${deadlineDate}), formal complaints will be filed with:`;
    this.currentPage.drawText(sanitizeText(warningText), {
      x: MARGIN + 10,
      y: startY + boxHeight - 26,
      size: 7.5,
      font: this.regularFont,
      color: COLOR_PRIMARY,
    });

    let agencyY = startY + boxHeight - 38;
    for (const agency of agencies) {
      this.currentPage.drawText(`•  ${sanitizeText(agency)}`, {
        x: MARGIN + 16,
        y: agencyY,
        size: 7.5,
        font: this.boldFont,
        color: COLOR_SECONDARY,
      });
      agencyY -= 11;
    }

    this.currentY = startY - 14;
  }

  /**
   * Draws a formal USPS Certified Mail Certificate of Service / Declaration under penalty of perjury.
   */
  drawCertificateOfService(data: {
    senderName: string;
    recipientName: string;
    recipientAddress: string;
    trackingNumber: string;
    date: string;
  }) {
    this.ensureSpace(160);
    this.drawSectionHeading('Certificate of Service & USPS Form 3800 Proof of Mailing');

    const certHeight = 145;
    const startY = this.currentY - certHeight;

    this.currentPage.drawRectangle({
      x: MARGIN,
      y: startY,
      width: USABLE_WIDTH,
      height: certHeight,
      color: COLOR_WHITE,
      borderColor: COLOR_POSTAL_GREEN,
      borderWidth: 1,
    });

    this.currentPage.drawText('DECLARATION OF SERVICE UNDER PENALTY OF PERJURY (28 U.S.C. § 1746)', {
      x: MARGIN + 10,
      y: startY + certHeight - 14,
      size: 8,
      font: this.boldFont,
      color: COLOR_POSTAL_GREEN,
    });

    const certPara1 = `I hereby certify that on ${data.date}, a true and correct copy of this Formal Dispute Demand was served upon ${data.recipientName} at the address ${data.recipientAddress} via the United States Postal Service as Certified Mail with Return Receipt Requested, bearing Article Tracking Number:`;
    const certLines1 = wrapText(certPara1, USABLE_WIDTH - 20, this.regularFont, 7.5);
    let cY = startY + certHeight - 26;
    for (const line of certLines1) {
      this.currentPage.drawText(line, {
        x: MARGIN + 10,
        y: cY,
        size: 7.5,
        font: this.regularFont,
        color: COLOR_PRIMARY,
      });
      cY -= 10;
    }

    this.currentPage.drawText(data.trackingNumber, {
      x: MARGIN + 10,
      y: cY - 2,
      size: 8.5,
      font: this.monoFont,
      color: COLOR_POSTAL_GREEN,
    });
    cY -= 14;

    const certPara2 = 'I declare under penalty of perjury under the laws of the United States of America that the foregoing is true and correct. Executed on the date of postmark indicated on the attached Certified Mail receipt.';
    const certLines2 = wrapText(certPara2, USABLE_WIDTH - 20, this.obliqueFont, 7.5);
    for (const line of certLines2) {
      this.currentPage.drawText(line, {
        x: MARGIN + 10,
        y: cY,
        size: 7.5,
        font: this.obliqueFont,
        color: COLOR_SECONDARY,
      });
      cY -= 10;
    }

    const certPara3 = 'USPS Form 3800 Receipt and Form 3811 Domestic Return Receipt Barcode are incorporated herein as Exhibit A.';
    this.currentPage.drawText(certPara3, {
      x: MARGIN + 10,
      y: cY - 2,
      size: 7.5,
      font: this.regularFont,
      color: COLOR_MUTED,
    });

    // Signature indicator
    this.currentPage.drawText(`Declarant: ${sanitizeText(data.senderName)} (Authorized Consumer Representative)`, {
      x: MARGIN + 10,
      y: startY + 8,
      size: 7.5,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    this.currentY = startY - 14;
  }

  /**
   * Draws the formal legal signature block.
   */
  drawSignatureBlock(signerName: string, title?: string) {
    this.ensureSpace(90);
    this.currentY -= 10;

    this.currentPage.drawText('Respectfully submitted,', {
      x: MARGIN,
      y: this.currentY,
      size: 9,
      font: this.regularFont,
      color: COLOR_PRIMARY,
    });

    this.currentY -= 32;

    // Signature line
    this.currentPage.drawLine({
      start: { x: MARGIN, y: this.currentY },
      end: { x: MARGIN + 220, y: this.currentY },
      thickness: 1,
      color: COLOR_PRIMARY,
    });

    this.currentY -= 12;

    this.currentPage.drawText(sanitizeText(signerName), {
      x: MARGIN,
      y: this.currentY,
      size: 9.5,
      font: this.boldFont,
      color: COLOR_PRIMARY,
    });

    this.currentY -= 11;

    this.currentPage.drawText(sanitizeText(title || 'Consumer Applicant & Authorized Representative'), {
      x: MARGIN,
      y: this.currentY,
      size: 8,
      font: this.obliqueFont,
      color: COLOR_MUTED,
    });

    this.currentY -= 12;

    this.currentPage.drawText(
      'Reservation of Rights: All rights reserved without prejudice under applicable federal and state law.',
      {
        x: MARGIN,
        y: this.currentY,
        size: 7.5,
        font: this.regularFont,
        color: COLOR_MUTED,
      }
    );

    this.currentY -= 14;
  }

  /**
   * Post-processes all pages to stamp standardized running footers with exact total page count.
   */
  stampFooters() {
    const totalPages = this.pages.length;
    for (let i = 0; i < totalPages; i++) {
      const page = this.pages[i];

      page.drawLine({
        start: { x: MARGIN, y: 38 },
        end: { x: PAGE_WIDTH - MARGIN, y: 38 },
        thickness: 0.5,
        color: COLOR_BORDER,
      });

      page.drawText('CONFIDENTIAL STATUTORY DISPUTE NOTICE — PRODUCED FOR LEGAL SERVICE', {
        x: MARGIN,
        y: 26,
        size: 7,
        font: this.boldFont,
        color: COLOR_MUTED,
      });

      const pageStr = `Page ${i + 1} of ${totalPages}`;
      const pageStrWidth = this.regularFont.widthOfTextAtSize(pageStr, 7.5);
      page.drawText(pageStr, {
        x: PAGE_WIDTH - MARGIN - pageStrWidth,
        y: 26,
        size: 7.5,
        font: this.regularFont,
        color: COLOR_MUTED,
      });
    }
  }
}

/**
 * Parses markdown text into structured elements (headings, bullets, paragraphs).
 */
interface StructuredBlock {
  type: 'heading' | 'bullet' | 'paragraph';
  prefix?: string;
  text: string;
}

function parseMarkdownLetterBlocks(markdown: string): StructuredBlock[] {
  const blocks: StructuredBlock[] = [];
  const lines = markdown.split(/\r?\n/);
  let accumulatedParagraph = '';

  const flushParagraph = () => {
    if (accumulatedParagraph.trim()) {
      blocks.push({
        type: 'paragraph',
        text: accumulatedParagraph.trim(),
      });
      accumulatedParagraph = '';
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip certified headers or address lines already rendered in caption block
    if (
      line.startsWith('**CERTIFIED MAIL') ||
      line.startsWith('**DATE:') ||
      line.startsWith('**SENT VIA:') ||
      line.startsWith('**FROM:') ||
      line.startsWith('**TO:') ||
      line.startsWith('**RE:') ||
      line.startsWith('**TOTAL CLAIMED') ||
      line.startsWith('**TOTAL BILLED') ||
      line.startsWith('**TOTAL DISPUTED') ||
      line.startsWith('**STATUTORY DEADLINE') ||
      line.startsWith('**STATUTORY OPEN') ||
      line.startsWith('**ALLEGED ACCOUNT') ||
      line.startsWith('**ACCOUNT /') ||
      line.startsWith('**DISPUTED TRADELINE') ||
      line.startsWith('**SUBSCRIPTION /') ||
      line.startsWith('**STATEMENT DATE:') ||
      line.startsWith('**ALLEGED ORIGINAL CREDITOR:') ||
      line.startsWith('___________________')
    ) {
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        text: line.replace(/^###\s*/, ''),
      });
      continue;
    }

    // Numbered bullet: e.g. "1. **Full Chain...**"
    const numberedMatch = line.match(/^([0-9]+\.)\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      blocks.push({
        type: 'bullet',
        prefix: numberedMatch[1],
        text: numberedMatch[2].replace(/\*\*/g, ''),
      });
      continue;
    }

    // Dash / bullet: e.g. "- Consumer Financial..."
    if (line.startsWith('- ') || line.startsWith('• ')) {
      flushParagraph();
      blocks.push({
        type: 'bullet',
        prefix: '•',
        text: line.replace(/^[-•]\s*/, '').replace(/\*\*/g, ''),
      });
      continue;
    }

    if (line === '') {
      flushParagraph();
    } else {
      accumulatedParagraph = accumulatedParagraph
        ? `${accumulatedParagraph} ${line}`
        : line;
    }
  }

  flushParagraph();
  return blocks;
}

/**
 * Primary PDF generation function.
 * Compiles a court-ready, certified mail dispute letter artifact in binary PDF format.
 */
export async function generateCourtReadyPdf(
  letter: CompiledDisputeLetter,
  options?: PdfGeneratorOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  // Document Metadata & Dictionary Catalog Properties
  doc.setTitle(letter.subjectLine || 'Formal Statutory Dispute Demand');
  doc.setAuthor(options?.signerNameOverride || 'Bureaucracy and Dispute Advocate');
  doc.setSubject(`Statutory Notice under ${letter.governingStatute?.code || 'Federal Consumer Protection Law'}`);
  doc.setKeywords([
    letter.disputeDomain,
    'USPS Certified Mail',
    'Return Receipt Requested',
    letter.trackingNumber,
  ]);
  doc.setProducer('Bureaucracy and Dispute Advocate Legal Engine v1.0');
  doc.setCreator('Bureaucracy and Dispute Advocate Platform');
  doc.setCreationDate(new Date(letter.generatedAt || Date.now()));
  doc.setModificationDate(new Date());

  // Set explicit unencoded catalog attributes for certified mail and statutory tracking
  doc.catalog.set(PDFName.of('TrackingNumber'), PDFString.of(letter.trackingNumber));
  doc.catalog.set(PDFName.of('ReturnReceiptNotice'), PDFString.of('RETURN RECEIPT REQUESTED'));
  doc.catalog.set(PDFName.of('DisputeDomain'), PDFString.of(letter.disputeDomain));

  // Embed core PDF fonts
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const obliqueFont = await doc.embedFont(StandardFonts.HelveticaOblique);
  const monoFont = await doc.embedFont(StandardFonts.CourierBold);

  const engine = new DocumentLayoutEngine(
    doc,
    {
      regular: regularFont,
      bold: boldFont,
      oblique: obliqueFont,
      mono: monoFont,
    },
    letter.trackingNumber,
    letter.subjectLine
  );

  // 1. Standard USPS Certified Mail Header with barcode
  if (options?.includeCertifiedMailHeader !== false) {
    engine.drawCertifiedMailHeader(letter.trackingNumber);
  }

  // 2. Formal Parties & Date Caption
  const dateFormatted = new Date(letter.generatedAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const signerName = options?.signerNameOverride || 'Jane Consumer';

  engine.drawPartiesAndDate({
    date: dateFormatted,
    senderName: signerName,
    senderAddress: 'Authorized Consumer Defense Address on File',
    recipientName: letter.recipientName,
    recipientAddress: letter.recipientAddress,
  });

  // 3. Subject Box & Case Overview
  engine.drawSubjectBlock({
    subjectLine: letter.subjectLine,
    disputeDomain: letter.disputeDomain,
    statutoryDeadlineDate: letter.statutoryDeadlineDate,
    statutorySlaDays: letter.statutorySlaDays,
    totalDisputedAmount: letter.totalDisputedAmount,
  });

  // 4. Body Content (Structured Markdown parsing)
  const blocks = parseMarkdownLetterBlocks(letter.fullLetterMarkdown || letter.bodyMarkdown);

  for (const block of blocks) {
    if (block.type === 'heading') {
      engine.drawSectionHeading(block.text);
    } else if (block.type === 'bullet') {
      engine.drawBulletPoint(block.prefix || '•', block.text);
    } else {
      // Clean markdown asterisks from paragraph for presentation
      const cleanPara = block.text.replace(/\*\*/g, '');
      engine.drawParagraph(cleanPara);
    }
  }

  // 5. Itemized Disputed Charges Table
  if (letter.disputedCharges && letter.disputedCharges.length > 0) {
    engine.drawItemizedChargesTable(letter.disputedCharges);
  }

  // 6. Statutory Authorities & Legal Citations Index
  if (letter.legalCitations && letter.legalCitations.length > 0) {
    engine.drawStatutoryAuthoritiesIndex(letter.legalCitations);
  }

  // 7. Regulatory Escalation Notice
  if (letter.escalationAgencies && letter.escalationAgencies.length > 0) {
    engine.drawRegulatoryAlertBox(
      letter.escalationAgencies,
      letter.statutoryDeadlineDate,
      letter.statutorySlaDays
    );
  }

  // 8. Formal Signature Block
  engine.drawSignatureBlock(signerName, options?.signerTitleOverride);

  // 9. USPS Form 3800 Certificate of Service & Proof of Delivery Declaration
  if (options?.includeCertificateOfService !== false) {
    engine.drawCertificateOfService({
      senderName: signerName,
      recipientName: letter.recipientName,
      recipientAddress: letter.recipientAddress,
      trackingNumber: letter.trackingNumber,
      date: dateFormatted,
    });
  }

  // 10. Stamp running footers across all pages
  engine.stampFooters();

  return await doc.save({ useObjectStreams: false });
}

/**
 * Convenience wrapper supporting object-based parameters.
 */
export async function generateCourtReadyDisputePdf(
  params: CourtReadyDisputePdfParams | CompiledDisputeLetter
): Promise<Uint8Array> {
  if ('letter' in params) {
    const effectiveLetter = {
      ...params.letter,
      trackingNumber: params.trackingNumber || params.letter.trackingNumber,
    };
    return generateCourtReadyPdf(effectiveLetter, params.options);
  }
  return generateCourtReadyPdf(params);
}
