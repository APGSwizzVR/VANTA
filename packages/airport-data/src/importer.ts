import { createWriteStream } from "node:fs";
import { mkdir, rm, rename } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const base = "https://ourairports.com/data";
const files = ["airports.csv", "runways.csv", "airport-frequencies.csv"];

async function download(url: string, destination: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: ${url} (${response.status})`);
  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destination));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(cell); cell = ""; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function table(text: string) {
  const rows = parseCsv(text);
  const headers = rows.shift() ?? [];
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

async function main() {
  const dir = ".cache/airport-data";
  await mkdir(dir, { recursive: true });
  for (const file of files) await download(`${base}/${file}`, `${dir}/${file}`);

  const airports = table(await Bun.file(`${dir}/airports.csv`).text());
  const runways = table(await Bun.file(`${dir}/runways.csv`).text());
  const frequencies = table(await Bun.file(`${dir}/airport-frequencies.csv`).text());

  console.log(`Downloaded ${airports.length} airports, ${runways.length} runways and ${frequencies.length} frequencies.`);
  console.log("Importer is intentionally data-source neutral: connect these records to the Prisma models in the deployment migration before production import.");

  await prisma.$disconnect();
}

main().catch(async error => { console.error(error); await prisma.$disconnect(); process.exit(1); });
