/**
 * Convert Gregorian date to Hebrew date using @hebcal/core
 * Outputs proper Hebrew numerals: ט׳ בשבט תשפ"ה
 */
import { HDate } from "@hebcal/core";

const HEBREW_MONTHS: Record<string, string> = {
  Nisan: "ניסן",
  Iyyar: "אייר",
  Sivan: "סיון",
  Tamuz: "תמוז",
  Av: "אב",
  Elul: "אלול",
  Tishrei: "תשרי",
  Cheshvan: "חשוון",
  Kislev: "כסלו",
  Tevet: "טבת",
  "Sh'vat": "שבט",
  Shvat: "שבט",
  Adar: "אדר",
  "Adar I": "אדר א׳",
  "Adar II": "אדר ב׳",
};

const HEBREW_YEARS: Record<number, string> = {
  5776: 'תשע"ו',
  5777: 'תשע"ז',
  5778: 'תשע"ח',
  5779: 'תשע"ט',
  5780: 'תש"פ',
  5781: 'תשפ"א',
  5782: 'תשפ"ב',
  5783: 'תשפ"ג',
  5784: 'תשפ"ד',
  5785: 'תשפ"ה',
  5786: 'תשפ"ו',
  5787: 'תשפ"ז',
  5788: 'תשפ"ח',
  5789: 'תשפ"ט',
  5790: 'תש"צ',
};

// Convert a number (1-30) to Hebrew day letters (gematria)
const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל"];

function dayToHebrew(day: number): string {
  if (day === 15) return 'ט"ו';
  if (day === 16) return 'ט"ז';
  const t = Math.floor(day / 10);
  const o = day % 10;
  const letters = (TENS[t] || "") + (ONES[o] || "");
  if (letters.length === 1) return letters + "׳";
  // Insert gershayim before last letter
  return letters.slice(0, -1) + "״" + letters.slice(-1);
}

export function toHebrewDate(dateStr: string): { hebDate: string; hebMonthYear: string } {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const hd = new HDate(new Date(y, m - 1, d));

    const day = hd.getDate();
    const monthEn = hd.getMonthName();
    const year = hd.getFullYear();

    const dayHe = dayToHebrew(day);
    const monthHe = HEBREW_MONTHS[monthEn] || monthEn;
    const yearHe = HEBREW_YEARS[year] || String(year);

    return {
      hebDate: `${dayHe} ב${monthHe} ${yearHe}`,
      hebMonthYear: `${monthHe} ${yearHe}`,
    };
  } catch {
    return { hebDate: "", hebMonthYear: "" };
  }
}
