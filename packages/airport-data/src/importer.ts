import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const base = "https://ourairports.com/data";
const files = ["airports.csv", "runways.csv", "airport-frequencies.csv"];

async function download(url: string, destination: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Download failed: ${url} (${response.status})`);
  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destination));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell); cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
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

  const airports = table(await readFile(`${dir}/airports.csv`, "utf8"));
  const runways = table(await readFile(`${dir}/runways.csv`, "utf8"));
  const frequencies = table(await readFile(`${dir}/airport-frequencies.csv`, "utf8"));

  console.log(`Downloaded ${airports.length} airports, ${runways.length} runways and ${frequencies.length} frequencies.`);
  console.log("Data source: OurAirports. Wire these records into the Prisma airport models during deployment/import.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
