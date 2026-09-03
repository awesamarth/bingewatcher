import type { Program } from "./types";

export function validateProgram(program: Program) {
  const issues: string[] = [];
  if (program.items.length < program.targetSize) issues.push(`${program.targetSize - program.items.length} pick(s) missing.`);
  if (program.items.length > program.targetSize) issues.push("The lineup contains too many movies.");

  for (const item of program.items) {
    const constraints = program.constraints;
    if (constraints.runtimeMax && item.runtime && item.runtime > constraints.runtimeMax) issues.push(`${item.title} exceeds ${constraints.runtimeMax} minutes.`);
    if (constraints.languages.length && !constraints.languages.map((language) => language.toLowerCase()).includes(item.originalLanguage.toLowerCase())) issues.push(`${item.title} does not match your language preference.`);
    if (constraints.genres.length && !item.genres.some((genre) => constraints.genres.some((wanted) => wanted.toLowerCase() === genre.toLowerCase()))) issues.push(`${item.title} does not match your genre preference.`);
    if (constraints.yearMin && item.year && item.year < constraints.yearMin) issues.push(`${item.title} was released before ${constraints.yearMin}.`);
    if (constraints.yearMax && item.year && item.year > constraints.yearMax) issues.push(`${item.title} was released after ${constraints.yearMax}.`);
    if (constraints.providers.length && !item.providers.some((provider) => constraints.providers.some((wanted) => provider.toLowerCase().includes(wanted.toLowerCase())))) issues.push(`${item.title} is not listed on the selected providers in ${constraints.region}.`);
  }

  return { valid: issues.length === 0, issues };
}
