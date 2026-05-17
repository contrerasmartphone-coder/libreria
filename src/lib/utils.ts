import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("it-IT");
  } catch {
    return dateStr;
  }
}
