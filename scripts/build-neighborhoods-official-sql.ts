import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type CsvRow = {
  name: string;
  city: string;
  region: string;
  sector: string;
  official_code: string;
  aliases: string;
  notes: string;
  status: string;
};

const ROOT = process.cwd();
const inputPath = resolve(ROOT, "supabase/seeds/neighborhoods.official.csv");
const outputDir = resolve(ROOT, "supabase/seeds/generated");
const sqlOutputPath = resolve(outputDir, "neighborhoods.official.generated.sql");
const structuredSqlOutputPath = resolve(outputDir, "neighborhoods.official.structured.generated.sql");
const reportOutputPath = resolve(outputDir, "neighborhoods.official.generated.report.md");

main();

function main() {
  const raw = readFileSync(inputPath, "utf8");
  const rows = parseCsv(raw);
  const duplicateNames = findDuplicateNames(rows);
  const validated = rows.map((row, index) => validateRow(row, index, duplicateNames));
  const errors = validated.flatMap((item) => item.errors);

  mkdirSync(outputDir, { recursive: true });

  if (errors.length > 0) {
    const report = buildReport(validated, errors, false);
    writeFileSync(reportOutputPath, report, "utf8");
    throw new Error(`Falha na validacao da lista oficial. Veja ${reportOutputPath}`);
  }

  const sql = buildSql(validated.map((item) => item.row));
  const structuredSql = buildStructuredSql(validated.map((item) => item.row));
  const report = buildReport(validated, [], true);

  writeFileSync(sqlOutputPath, sql, "utf8");
  writeFileSync(structuredSqlOutputPath, structuredSql, "utf8");
  writeFileSync(reportOutputPath, report, "utf8");

  console.log(`SQL gerado em: ${sqlOutputPath}`);
  console.log(`SQL estruturado gerado em: ${structuredSqlOutputPath}`);
  console.log(`Relatorio gerado em: ${reportOutputPath}`);
}

function parseCsv(raw: string): CsvRow[] {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("Arquivo CSV vazio ou sem linhas de dados.");
  }

  const headers = splitCsvLine(lines[0]).map((value) => value.trim());
  const expected = ["name", "city", "region", "sector", "official_code", "aliases", "notes", "status"];

  if (headers.join("|") !== expected.join("|")) {
    throw new Error(`Colunas invalidas. Esperado: ${expected.join(", ")}`);
  }

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return {
      name: values[0] ?? "",
      city: values[1] ?? "",
      region: values[2] ?? "",
      sector: values[3] ?? "",
      official_code: values[4] ?? "",
      aliases: values[5] ?? "",
      notes: values[6] ?? "",
      status: values[7] ?? ""
    };
  });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (quoted && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function validateRow(row: CsvRow, index: number, duplicateNames: Set<string>) {
  const errors: string[] = [];
  const normalizedStatus = normalizeValue(row.status);
  const normalizedName = normalizeValue(row.name);
  const normalizedSector = normalizeValue(row.sector);
  const normalizedOfficialCode = normalizeValue(row.official_code);

  if (!normalizedName) errors.push(`Linha ${index + 2}: campo name obrigatorio.`);
  if (!normalizeValue(row.city)) errors.push(`Linha ${index + 2}: campo city obrigatorio.`);
  if (!normalizedOfficialCode || !/^\d+$/.test(normalizedOfficialCode)) errors.push(`Linha ${index + 2}: official_code deve ser numerico.`);
  if (normalizedSector && !["SCN", "SO", "SN", "SL", "SS", "SCS", "SSO"].includes(normalizedSector)) {
    errors.push(`Linha ${index + 2}: sector invalido (${row.sector}).`);
  }
  if (duplicateNames.has(normalizeKey(normalizedName))) errors.push(`Linha ${index + 2}: nome duplicado (${row.name}).`);
  if (looksLikePersonalAddress(normalizedName)) errors.push(`Linha ${index + 2}: nome parece endereco pessoal ou logradouro especifico (${row.name}).`);
  if (looksSensitiveTerritory(normalizedName)) errors.push(`Linha ${index + 2}: nome parece territorio sensivel ou identificavel (${row.name}).`);
  if (normalizedStatus && !["oficial", "provisorio", "revisar", "nao_usar"].includes(normalizedStatus)) {
    errors.push(`Linha ${index + 2}: status invalido (${row.status}).`);
  }

  return {
    row: {
      ...row,
      name: normalizeValue(row.name),
      city: normalizeValue(row.city),
      region: normalizeValue(row.region),
      sector: normalizedSector,
      official_code: normalizedOfficialCode,
      aliases: normalizeValue(row.aliases),
      notes: normalizeValue(row.notes),
      status: normalizedStatus
    },
    errors
  };
}

function buildStructuredSql(rows: CsvRow[]) {
  const values = rows
    .map((row) => `  (${quote(row.name)}, ${quote(row.city)}, ${quote(row.region)}, ${quote(row.sector)}, ${Number(row.official_code)}, ${nullableQuote(row.aliases)}, ${quote(row.notes)}, ${quote(row.status || "oficial")})`)
    .join(",\n");

  return [
    "-- GENERATED FILE: lista oficial estruturada de bairros de Volta Redonda.",
    "-- Fonte: PDFs oficiais conferidos em reports/neighborhoods-official-final-conference-report.md.",
    "-- Nao apaga bairros existentes, nao remove vinculos e nao geocodifica.",
    "-- Exige a migration de metadados oficiais em public.neighborhoods.",
    "",
    "with official(name, city, region, sector, official_code, aliases, notes, status) as (",
    "  values",
    values,
    "),",
    "updated_by_code as (",
    "  update public.neighborhoods n",
    "  set name = o.name,",
    "      city = o.city,",
    "      region = o.region,",
    "      sector = o.sector,",
    "      official_code = o.official_code,",
    "      aliases = o.aliases,",
    "      notes = o.notes,",
    "      status = o.status,",
    "      updated_at = now()",
    "  from official o",
    "  where n.official_code = o.official_code",
    "  returning o.official_code",
    "),",
    "updated_by_name as (",
    "  update public.neighborhoods n",
    "  set city = o.city,",
    "      region = o.region,",
    "      sector = o.sector,",
    "      official_code = o.official_code,",
    "      aliases = o.aliases,",
    "      notes = o.notes,",
    "      status = o.status,",
    "      updated_at = now()",
    "  from official o",
    "  where lower(n.name) = lower(o.name)",
    "    and coalesce(n.city, o.city) = o.city",
    "    and not exists (select 1 from updated_by_code c where c.official_code = o.official_code)",
    "  returning o.official_code",
    ")",
    "insert into public.neighborhoods (name, city, region, sector, official_code, aliases, notes, status)",
    "select o.name, o.city, o.region, o.sector, o.official_code, o.aliases, o.notes, o.status",
    "from official o",
    "where not exists (select 1 from updated_by_code c where c.official_code = o.official_code)",
    "  and not exists (select 1 from updated_by_name n where n.official_code = o.official_code)",
    "  and not exists (select 1 from public.neighborhoods existing where lower(existing.name) = lower(o.name) and coalesce(existing.city, o.city) = o.city);",
    ""
  ].join("\n");
}

function findDuplicateNames(rows: CsvRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = normalizeKey(row.name);
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
}

function buildSql(rows: CsvRow[]) {
  const values = rows
    .map((row) => `  (${quote(row.name)}, ${quote(row.city)}, ${quote(buildNotes(row))})`)
    .join(",\n");

  return [
    "-- GENERATED FILE: lista oficial de territorios.",
    "-- Nao sobrescreve migrations existentes. Use em seed ou copie para migration nova revisada.",
    "insert into public.neighborhoods (name, city, notes)",
    "values",
    values,
    "on conflict (name) do update",
    "set",
    "  city = excluded.city,",
    "  notes = excluded.notes;",
    ""
  ].join("\n");
}

function buildReport(validated: Array<{ row: CsvRow; errors: string[] }>, errors: string[], success: boolean) {
  return [
    "# Relatorio de validacao da lista oficial",
    "",
    `- Resultado: ${success ? "ok" : "falhou"}`,
    `- Linhas lidas: ${validated.length}`,
    `- Linhas com erro: ${validated.filter((item) => item.errors.length > 0).length}`,
    "",
    "## Erros",
    "",
    ...(errors.length > 0 ? errors.map((error) => `- ${error}`) : ["- Nenhum erro."]),
    "",
    "## Linhas validadas",
    "",
    ...validated.map((item) => `- ${item.row.name || "(sem nome)"} | ${item.row.city || "(sem cidade)"} | ${item.row.status || "(sem status)"}`),
    ""
  ].join("\n");
}

function buildNotes(row: CsvRow) {
  const parts = [
    row.region ? `Regiao: ${row.region}` : "",
    row.sector ? `Setor: ${row.sector}` : "",
    row.official_code ? `Codigo oficial: ${row.official_code}` : "",
    row.aliases ? `Aliases: ${row.aliases}` : "",
    row.notes ? `Notas: ${row.notes}` : "",
    row.status ? `Status: ${row.status}` : ""
  ].filter(Boolean);

  return parts.join(" | ");
}

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKey(value: string) {
  return normalizeValue(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function looksLikePersonalAddress(value: string) {
  const key = normalizeKey(value);
  return /\b(rua|avenida|av|travessa|alameda|estrada|rodovia|casa|lote|quadra)\b/.test(key) || /\b\d{1,5}\b/.test(key);
}

function looksSensitiveTerritory(value: string) {
  const key = normalizeKey(value);
  return /\b(casa de|familia|paciente|pessoa|morador|residencia|abrigo sigiloso)\b/.test(key);
}

function quote(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function nullableQuote(value: string) {
  return value ? quote(value) : "null";
}
