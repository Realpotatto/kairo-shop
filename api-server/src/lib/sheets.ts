import { google } from "googleapis";
import { logger } from "./logger.js";

// ─── Setup ─────────────────────────────────────────────────────────────────
// In Railway, set these env vars:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  → service account email
//   GOOGLE_SERVICE_ACCOUNT_KEY    → private key (with \n as literal \n)
//   SHEETS_<NAME>_ID              → sheet ID for each sheet, e.g. SHEETS_USERS_ID

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Google Sheets not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY env vars."
    );
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ─── Sheet ID helpers ───────────────────────────────────────────────────────
// Returns the sheet ID for a named sheet.
// Usage: getSheetId("USERS") → reads env SHEETS_USERS_ID
export function getSheetId(name: string): string {
  const id = process.env[`SHEETS_${name.toUpperCase()}_ID`];
  if (!id) throw new Error(`Env var SHEETS_${name.toUpperCase()}_ID is not set`);
  return id;
}

// ─── Core operations ────────────────────────────────────────────────────────

/** Read all rows from a sheet. Returns string[][] */
export async function readSheet(
  spreadsheetId: string,
  range: string = "Sheet1"
): Promise<string[][]> {
  try {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return (res.data.values as string[][]) ?? [];
  } catch (err) {
    logger.error({ err, spreadsheetId, range }, "readSheet error");
    throw err;
  }
}

/** Overwrite a range with new values */
export async function writeSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean | null)[][]
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  } catch (err) {
    logger.error({ err, spreadsheetId, range }, "writeSheet error");
    throw err;
  }
}

/** Append rows to a sheet */
export async function appendSheet(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean | null)[][]
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values },
    });
  } catch (err) {
    logger.error({ err, spreadsheetId, range }, "appendSheet error");
    throw err;
  }
}

/** Clear a range */
export async function clearSheet(
  spreadsheetId: string,
  range: string
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.clear({ spreadsheetId, range });
  } catch (err) {
    logger.error({ err, spreadsheetId, range }, "clearSheet error");
    throw err;
  }
}

/** Read sheet as array of objects using first row as headers */
export async function readSheetAsObjects(
  spreadsheetId: string,
  range: string = "Sheet1"
): Promise<Record<string, string>[]> {
  const rows = await readSheet(spreadsheetId, range);
  if (rows.length < 1) return [];
  const [headers, ...data] = rows;
  return data.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

/** Write array of objects back to sheet (headers from first object's keys) */
export async function writeSheetFromObjects(
  spreadsheetId: string,
  range: string,
  objects: Record<string, unknown>[]
): Promise<void> {
  if (objects.length === 0) return;
  const headers = Object.keys(objects[0]);
  const rows = objects.map((o) => headers.map((h) => String(o[h] ?? "")));
  await writeSheet(spreadsheetId, range, [headers, ...rows]);
}
