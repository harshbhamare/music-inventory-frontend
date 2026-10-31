import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministic Indian-style currency formatter.
 * Uses manual digit grouping (2-2-3 from right) so the ₹ symbol
 * is always the plain Unicode character regardless of runtime locale/Intl data.
 * Works identically in Node SSR, Chrome, Safari, and Firefox.
 */
export function formatCurrency(amount: number, _currency = "INR", symbol = "\u20B9"): string {
  if (isNaN(amount) || amount == null) return `${symbol}0`;

  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount)); // round to whole rupees

  // Build the Indian digit-grouping: last 3 digits, then groups of 2
  const str = String(abs);
  let result = "";
  if (str.length <= 3) {
    result = str;
  } else {
    const last3 = str.slice(-3);
    const rest  = str.slice(0, -3);
    const groups: string[] = [];
    for (let i = rest.length; i > 0; i -= 2) {
      groups.unshift(rest.slice(Math.max(0, i - 2), i));
    }
    result = groups.join(",") + "," + last3;
  }

  return `${isNegative ? "-" : ""}${symbol}${result}`;
}

export function formatDate(dateString?: string | Date): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString?: string | Date): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'INR Zero Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    } else {
      str += a[n];
    }
    return str;
  };

  const whole = Math.floor(num);
  const fraction = Math.round((num - whole) * 100);

  let n = whole;
  let result = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) result += inWords(crore) + 'Crore ';

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) result += inWords(lakh) + 'Lakh ';

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) result += inWords(thousand) + 'Thousand ';

  const hundred = Math.floor(n / 100);
  n %= 100;
  if (hundred > 0) result += inWords(hundred) + 'Hundred ';

  if (n > 0) {
    if (result !== '') result += 'and ';
    result += inWords(n);
  }

  let finalWords = 'INR ' + result.trim();
  if (fraction > 0) {
    finalWords += ' and ' + inWords(fraction).trim() + ' Paise';
  }
  return finalWords + ' Only';
}

/**
 * Formats a number with exactly 2 decimal places using Indian grouping.
 * Used in tax invoices where paise are needed.
 * Falls back to manual formatting to avoid Intl locale data issues.
 */
export function formatIndianDecimal(num: number): string {
  if (isNaN(num) || num == null) return "0.00";
  const fixed = num.toFixed(2);                    // always produces e.g. "4050.00"
  const [intPart, decPart] = fixed.split(".");
  const str = intPart.replace(/^-/, "");
  const isNeg = intPart.startsWith("-");
  let grouped = "";
  if (str.length <= 3) {
    grouped = str;
  } else {
    const last3 = str.slice(-3);
    const rest  = str.slice(0, -3);
    const parts: string[] = [];
    for (let i = rest.length; i > 0; i -= 2) {
      parts.unshift(rest.slice(Math.max(0, i - 2), i));
    }
    grouped = parts.join(",") + "," + last3;
  }
  return `${isNeg ? "-" : ""}${grouped}.${decPart}`;
}

