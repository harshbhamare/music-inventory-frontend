import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR", symbol = "₹"): string {
  if (isNaN(amount)) return `${symbol}0`;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
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

export function formatIndianDecimal(num: number): string {
  return Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

