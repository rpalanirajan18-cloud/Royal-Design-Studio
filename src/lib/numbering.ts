/**
 * Royal Design Studio — Document Number Generator
 *
 * Concurrency-safe document numbering using PostgreSQL advisory locks
 * via Prisma transactions.
 *
 * Format: {prefix}/{typeCode}/{financialYear}/{sequence}
 * Example: RDS/INV/2026-27/0001
 */

import { prisma } from "@/lib/prisma";
import { DocumentType } from "@prisma/client";

/** Returns the current Indian financial year string, e.g. "2026-27" */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();
  // Indian FY: April (4) to March (3)
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

interface NumberingConfig {
  prefix: string;
  typeCode: string;
  separator: string;
  padLength: number;
}

const DEFAULT_CONFIGS: Record<DocumentType, NumberingConfig> = {
  INVOICE: {
    prefix: "RDS",
    typeCode: "INV",
    separator: "/",
    padLength: 4,
  },
  QUOTATION: {
    prefix: "RDS",
    typeCode: "QTN",
    separator: "/",
    padLength: 4,
  },
  PROFORMA: {
    prefix: "RDS",
    typeCode: "PI",
    separator: "/",
    padLength: 4,
  },
  RECEIPT: {
    prefix: "RDS",
    typeCode: "REC",
    separator: "/",
    padLength: 4,
  },
  ORDER: {
    prefix: "RDS",
    typeCode: "ORD",
    separator: "/",
    padLength: 4,
  },
  EXPENSE: {
    prefix: "RDS",
    typeCode: "EXP",
    separator: "/",
    padLength: 4,
  },
};

/**
 * Atomically allocate the next document number for the given type and
 * financial year. Uses a database transaction to prevent duplicates even
 * under concurrent requests.
 *
 * @param documentType - The type of document to number
 * @param date - The date to determine the financial year (defaults to now)
 * @param overrideConfig - Override default prefix/typeCode/etc.
 * @returns The formatted document number string
 */
export async function allocateDocumentNumber(
  documentType: DocumentType,
  date: Date = new Date(),
  overrideConfig?: Partial<NumberingConfig>
): Promise<string> {
  const financialYear = getCurrentFinancialYear(date);
  const config = { ...DEFAULT_CONFIGS[documentType], ...overrideConfig };

  // Use a transaction to safely increment the sequence counter
  const result = await prisma.$transaction(async (tx) => {
    // Upsert the sequence row and lock it for update
    const sequence = await tx.documentSequence.upsert({
      where: {
        documentType_financialYear: {
          documentType,
          financialYear,
        },
      },
      create: {
        documentType,
        financialYear,
        lastNumber: 1,
      },
      update: {
        lastNumber: {
          increment: 1,
        },
      },
    });

    return sequence.lastNumber;
  });

  // Format: RDS/INV/2026-27/0001
  const { prefix, typeCode, separator, padLength } = config;
  const seq = String(result).padStart(padLength, "0");
  return [prefix, typeCode, financialYear, seq].join(separator);
}
