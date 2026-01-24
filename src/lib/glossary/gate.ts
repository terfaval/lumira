export const GLOSSARY_GATE_THRESHOLD = 10;

export function allowGlossaryAccess(candidateCount: number): boolean {
  return candidateCount >= GLOSSARY_GATE_THRESHOLD;
}
