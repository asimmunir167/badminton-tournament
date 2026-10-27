import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CertificateType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { uploadsDir } from "../../lib/uploads";
import { ApiError } from "../../middleware/errorHandler";
import { computeCategoryPlacements, listCategoryRankings } from "../rankings/rankings.service";

const certDir = path.join(uploadsDir, "certificates");
fs.mkdirSync(certDir, { recursive: true });

function typeForRank(rank: number): CertificateType {
  if (rank === 1) return "CHAMPION";
  if (rank === 2) return "RUNNER_UP";
  if (rank === 3) return "THIRD";
  return "PARTICIPATION";
}

function labelForType(type: CertificateType): string {
  switch (type) {
    case "CHAMPION":
      return "Champion";
    case "RUNNER_UP":
      return "Runner-Up";
    case "THIRD":
      return "Third Place";
    default:
      return "Participant";
  }
}

/** Minimal PDF (no external deps) — readable in browsers/Adobe. */
function writeSimplePdf(filePath: string, lines: string[]): void {
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const contentLines = ["BT", "/F1 18 Tf", "50 750 Td"];
  lines.forEach((line, i) => {
    if (i === 0) contentLines.push(`(${escape(line)}) Tj`);
    else contentLines.push(`0 -28 Td (${escape(line)}) Tj`);
  });
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  fs.writeFileSync(filePath, pdf);
}

async function writeCertificatePdf(opts: {
  filePath: string;
  tournamentName: string;
  categoryName: string;
  playerName: string;
  type: CertificateType;
  certificateNumber: string;
  issuedAt: Date;
}): Promise<void> {
  try {
    const PDFDocument = (await import("pdfkit")).default;
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
      const stream = fs.createWriteStream(opts.filePath);
      doc.pipe(stream);
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke("#0f172a");
      doc.fontSize(28).fillColor("#0f172a").text("Certificate of Achievement", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor("#334155").text(opts.tournamentName, { align: "center" });
      doc.moveDown(1.5);
      doc.fontSize(12).fillColor("#64748b").text("This certifies that", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(26).fillColor("#0369a1").text(opts.playerName, { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#64748b").text(`is awarded ${labelForType(opts.type)} in`, { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(16).fillColor("#0f172a").text(opts.categoryName, { align: "center" });
      doc.moveDown(2);
      doc.fontSize(10).fillColor("#94a3b8").text(`Certificate No: ${opts.certificateNumber}`, { align: "center" });
      doc.text(`Issued: ${opts.issuedAt.toISOString().slice(0, 10)}`, { align: "center" });
      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });
  } catch {
    writeSimplePdf(opts.filePath, [
      "Certificate of Achievement",
      opts.tournamentName,
      opts.playerName,
      labelForType(opts.type),
      opts.categoryName,
      opts.certificateNumber,
      opts.issuedAt.toISOString().slice(0, 10),
    ]);
  }
}

export async function issueCategoryCertificates(categoryId: string, baseUrl: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  try {
    await computeCategoryPlacements(categoryId);
  } catch {
    // participation certificates still issued
  }

  const rankings = await listCategoryRankings(categoryId).catch(() => []);
  const entries = await prisma.categoryEntry.findMany({
    where: { categoryId },
    include: { player1: true, player2: true },
  });

  const rankByPlayer = new Map<string, number>();
  for (const row of rankings as { entityId: string; rank: number }[]) {
    rankByPlayer.set(row.entityId, row.rank);
  }

  const issued = [];

  for (const entry of entries) {
    const players = [entry.player1, entry.player2].filter(Boolean);
    for (const player of players) {
      if (!player) continue;
      const rank = rankByPlayer.get(player.id);
      const type = rank != null ? typeForRank(rank) : "PARTICIPATION";
      const certificateNumber = `CERT-${category.tournament.slug.slice(0, 12).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const filename = `${certificateNumber}.pdf`;
      const filePath = path.join(certDir, filename);
      const issuedAt = new Date();

      await writeCertificatePdf({
        filePath,
        tournamentName: category.tournament.name,
        categoryName: category.name,
        playerName: player.fullName,
        type,
        certificateNumber,
        issuedAt,
      });

      const pdfUrl = `${baseUrl}/uploads/certificates/${filename}`;
      const cert = await prisma.certificate.create({
        data: {
          tournamentId: category.tournamentId,
          categoryId,
          playerId: player.id,
          type,
          certificateNumber,
          pdfUrl,
          issuedAt,
        },
      });
      issued.push(cert);
    }
  }

  return issued;
}

export async function listTournamentCertificates(tournamentId: string) {
  return prisma.certificate.findMany({
    where: { tournamentId },
    include: {
      player: { select: { id: true, fullName: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
}
