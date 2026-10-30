import { CONFIG } from "./config.js";

export class SheetsError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "SheetsError";
    this.status = status;
  }
}

/** Parse formatted currency text into the numeric value required by the color scale. */
export function parseMoney(value) {
  const amount = Number(String(value ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase();
}

export async function fetchPeople(token) {
  const range = encodeURIComponent(CONFIG.RANGE);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
  let response;

  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (error) {
    throw new SheetsError(error instanceof Error ? error.message : "Network request failed", 0);
  }

  if (!response.ok) {
    throw new SheetsError(`Sheets API returned ${response.status}`, response.status);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new SheetsError("The Sheets API returned an invalid response", response.status);
  }

  const values = payload.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new SheetsError("The worksheet is empty or its header row is missing", 400);
  }

  const headers = values[0].map(normalizeHeader);
  const requiredHeaders = ["name", "photo", "age", "country", "interest", "net worth"];
  const columns = Object.fromEntries(requiredHeaders.map((header) => [header, headers.indexOf(header)]));
  const missingHeaders = requiredHeaders.filter((header) => columns[header] < 0);
  if (missingHeaders.length) {
    throw new SheetsError(`Missing worksheet header${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.join(", ")}`, 400);
  }

  return values.slice(1)
    .filter((row) => String(row[columns.name] ?? "").trim() !== "")
    .map((row) => ({
      name: String(row[columns.name] ?? "").trim(),
      photo: String(row[columns.photo] ?? "").trim(),
      age: String(row[columns.age] ?? "").trim(),
      country: String(row[columns.country] ?? "").trim(),
      interest: String(row[columns.interest] ?? "").trim(),
      netWorth: parseMoney(row[columns["net worth"]])
    }));
}

export function describeSheetsError(error) {
  const messages = {
    400: { text: "The worksheet range is invalid. Check the tab name in RANGE in js/config.js.", action: "Try again" },
    401: { text: "Your session expired. Sign in again to reload the data.", action: "Sign out" },
    403: { text: "This Google account cannot open the Sheet, or the Google Sheets API is not enabled for the project.", action: "Sign out" },
    404: { text: "The Sheet was not found. Check SHEET_ID in js/config.js.", action: "" }
  };
  return messages[error?.status] || { text: "Could not load the data. Check your connection and try again.", action: "Try again" };
}
