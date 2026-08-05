import { canonicalId } from "@/src/cognition/observation-v3/memory-realization/canonical-identity";
import type {
  CanonicalAlternative,
  CanonicalDescriptiveUnit,
  CanonicalLocality,
  CanonicalTransition,
  CanonicalUncertaintyRecord,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

export function realizeCanonicalUncertainty(input: {
  bundleNotes: readonly string[];
  localities: readonly CanonicalLocality[];
  units: readonly CanonicalDescriptiveUnit[];
  transitions: readonly CanonicalTransition[];
  alternatives: readonly CanonicalAlternative[];
}): CanonicalUncertaintyRecord[] {
  const records: CanonicalUncertaintyRecord[] = [];

  for (const note of input.bundleNotes) {
    records.push({
      canonicalUncertaintyId: canonicalId("uncertainty", { subjectType: "bundle", subjectId: null, note }),
      subjectType: "bundle",
      subjectId: null,
      uncertaintyType: "certainty_assessment_unavailable",
      note,
    });
  }

  for (const locality of input.localities) {
    if (locality.boundaryUncertainty) {
      records.push({
        canonicalUncertaintyId: canonicalId("uncertainty", { subjectType: "locality", subjectId: locality.canonicalLocalityId, note: locality.boundaryUncertainty }),
        subjectType: "locality",
        subjectId: locality.canonicalLocalityId,
        uncertaintyType: "boundary_uncertainty",
        note: locality.boundaryUncertainty,
      });
    }
  }

  for (const unit of input.units) {
    if (unit.uncertainty) {
      records.push({
        canonicalUncertaintyId: canonicalId("uncertainty", { subjectType: "unit", subjectId: unit.canonicalUnitId, note: unit.uncertainty }),
        subjectType: "unit",
        subjectId: unit.canonicalUnitId,
        uncertaintyType: "statement_uncertainty",
        note: unit.uncertainty,
      });
    }
  }

  for (const transition of input.transitions) {
    if (transition.uncertainty) {
      records.push({
        canonicalUncertaintyId: canonicalId("uncertainty", { subjectType: "transition", subjectId: transition.canonicalTransitionId, note: transition.uncertainty }),
        subjectType: "transition",
        subjectId: transition.canonicalTransitionId,
        uncertaintyType: "transition_uncertainty",
        note: transition.uncertainty,
      });
    }
  }

  for (const alternative of input.alternatives) {
    records.push({
      canonicalUncertaintyId: canonicalId("uncertainty", { subjectType: "alternative", subjectId: alternative.canonicalAlternativeId }),
      subjectType: "alternative",
      subjectId: alternative.canonicalAlternativeId,
      uncertaintyType: "alternative_preserved",
      note: null,
    });
  }

  return records;
}
