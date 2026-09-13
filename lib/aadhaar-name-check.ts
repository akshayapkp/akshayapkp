export type DetailType = "no-change" | "change-minor" | "change-major";

export interface NameCheckDetail { type: DetailType; text: string; }
export interface NameCheckResult {
  aadhaarName: string; requestedName: string; gazetteNeeded: boolean; majorChange: boolean;
  muhammadExceptionTriggered: boolean; confidence: number; details: NameCheckDetail[];
  status: "same" | "required" | "not-required" | "caution"; message: string; confidenceNote: string;
}

const MUHAMMAD_VARIANTS = /^(muhammed|mohammed|mohammad|muhammad|mohamed|mohamad|muhamed|muhamad)$/i;
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const tokens = (value: string) => { const normalized = normalize(value); return normalized ? normalized.split(" ") : []; };
const noSpace = (value: string) => normalize(value).replace(/\s/g, "");
const iyCanonical = (value: string) => value.replace(/[iy]/gi, "i");
const isMuhammad = (value: string) => MUHAMMAD_VARIANTS.test(value.trim());
const minorVariant = (a: string, b: string) => a === b || (isMuhammad(a) && isMuhammad(b)) || (a.length === b.length && iyCanonical(a) === iyCanonical(b));
const phoneticKey = (value: string) => value.toLowerCase().replace(/ph/g, "f").replace(/kh/g, "k").replace(/gh/g, "g").replace(/th/g, "t").replace(/dh/g, "d").replace(/bh/g, "b").replace(/sh/g, "s").replace(/ch/g, "c").replace(/v/g, "w").replace(/z/g, "s").replace(/[iy]/g, "i").replace(/oo/g, "u").replace(/ee/g, "i").replace(/(.)\1+/g, "$1");
function levenshtein(a: string, b: string) { const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0)); for (let i = 0; i <= a.length; i++) dp[i][0] = i; for (let j = 0; j <= b.length; j++) dp[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]); return dp[a.length][b.length]; }

export function checkAadhaarName(rawOld: string, rawNew: string): NameCheckResult {
  const aadhaarName = rawOld.trim(), requestedName = rawNew.trim();
  if (!aadhaarName || !requestedName) throw new Error("Please enter both names.");
  const oldTokens = tokens(aadhaarName), newTokens = tokens(requestedName);
  const details: NameCheckDetail[] = []; let gazetteNeeded = false; let majorChange = false; let muhammadExceptionTriggered = false;
  if (normalize(aadhaarName) === normalize(requestedName)) details.push({ type: "no-change", text: "No change detected. Names are identical." });
  else {
    const sameTokenCount = oldTokens.length === newTokens.length;
    const spacingOnly = noSpace(aadhaarName) === noSpace(requestedName);
    const allMinor = sameTokenCount && oldTokens.every((token, i) => minorVariant(token, newTokens[i]));
    const spacingAndIY = iyCanonical(noSpace(aadhaarName)) === iyCanonical(noSpace(requestedName));
    muhammadExceptionTriggered = sameTokenCount && oldTokens.some((token, i) => isMuhammad(token) && isMuhammad(newTokens[i]));
    if (spacingOnly) details.push({ type: "change-minor", text: "Only spacing between name parts has changed. This is an allowed exception." });
    else if (muhammadExceptionTriggered && allMinor) details.push({ type: "change-minor", text: "Phonetic name variation detected (e.g. Mohammed / Muhammad / Muhammed — all are the same name). This is a recognised phonetic exception; Gazette is NOT required." });
    else if (allMinor) details.push({ type: "change-minor", text: 'Only an "i" ↔ "y" letter variation detected within name part(s). This is an allowed exception.' });
    else if (spacingAndIY) details.push({ type: "change-minor", text: 'Combination of spacing change and "i" ↔ "y" letter variation detected. This is an allowed exception.' });
    else {
      const reordered = [...oldTokens].sort().join(" ") === [...newTokens].sort().join(" ");
      if (reordered) { gazetteNeeded = true; majorChange = true; details.push({ type: "change-major", text: "Name parts have been reordered (e.g. first name and surname swapped). Gazette notification is required." }); }
      else if (oldTokens[0] !== newTokens[0] && !minorVariant(oldTokens[0] || "", newTokens[0] || "")) { gazetteNeeded = true; majorChange = true; details.push({ type: "change-major", text: "The first name has been changed/corrected. Gazette notification is required." }); }
      else details.push({ type: "change-minor", text: 'First name is unchanged (or only a minor "i"/"y" variation). Change appears limited to middle/last name parts.' });
      if (oldTokens.length !== newTokens.length) details.push({ type: "no-change", text: "Number of name parts differs between the two names." });
    }
  }
  const oldPhonetic = oldTokens.map(phoneticKey).join(""), newPhonetic = newTokens.map(phoneticKey).join("");
  const phoneticSimilarity = 1 - levenshtein(oldPhonetic, newPhonetic) / Math.max(oldPhonetic.length, newPhonetic.length, 1);
  const literalSimilarity = 1 - levenshtein(noSpace(aadhaarName), noSpace(requestedName)) / Math.max(noSpace(aadhaarName).length, noSpace(requestedName).length, 1);
  let confidence = !gazetteNeeded && muhammadExceptionTriggered ? 88 : !gazetteNeeded ? Math.min(99, 92 + Math.round(phoneticSimilarity * 8)) : Math.round(Math.max(2, Math.min(majorChange ? phoneticSimilarity * 70 * .6 + literalSimilarity * 15 : phoneticSimilarity * 70 + literalSimilarity * 15, 70)));
  let status: NameCheckResult["status"], message: string, confidenceNote: string;
  if (gazetteNeeded) { status = "required"; message = "Gazette Notification is REQUIRED for this name change."; confidenceNote = confidence >= 50 ? "Although a Gazette notification is technically required, the pronunciation of both names is very similar. Some applications with phonetically close names are accepted without Gazette, but this is at the discretion of the verifying officer — Gazette is still recommended." : "The names sound noticeably different. Gazette notification is strongly recommended before applying for this correction."; }
  else if (normalize(aadhaarName) === normalize(requestedName)) { status = "same"; message = "No change needed — names match."; confidenceNote = "The names are identical."; }
  else if (muhammadExceptionTriggered) { status = "caution"; message = "Gazette Notification is not technically required — but a slight chance of rejection exists due to spelling difference."; confidenceNote = "Mohammed, Muhammad, Muhammed, Mohammad and similar spellings are treated by this checker as phonetic variants. Gazette notification is generally not required, though the verifying officer has final discretion."; }
  else { status = "not-required"; message = "Gazette Notification is NOT required — change is within allowed exceptions."; confidenceNote = "This change falls under an accepted exception and/or the names sound effectively the same, so it should normally be processed without a Gazette notification."; }
  return { aadhaarName, requestedName, gazetteNeeded, majorChange, muhammadExceptionTriggered, confidence, details, status, message, confidenceNote };
}
