export type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOutputPacket,
  OpportunityConstructorValidationResult,
  OpportunityRepositoryCreateMapping,
  ValidatedOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";

export { parseOpportunityConstructorOutput } from "@/src/cognition/latent-v2/opportunity-constructor/parser";
export { validateOpportunityConstructorOutput, parseAndValidateOpportunityConstructorOutput } from "@/src/cognition/latent-v2/opportunity-constructor/validator";
export { mapValidatedOpportunityConstructorOutputToRepositoryInputs } from "@/src/cognition/latent-v2/opportunity-constructor/mapping";
export {
  composeOpportunityConstructorInputPacket,
  composeOpportunityConstructorInputPacketWithProvenance,
} from "@/src/cognition/latent-v2/opportunity-constructor/input-packet-composer";
export {
  buildAuthorityFingerprint,
  canonicalizeAuthorityProvenance,
  captureExecutionProvenance,
  projectAuthorityProvenance,
  projectContextProvenance,
  type ComposedOpportunityConstructorInput,
  type LatentAuthorityProvenance,
  type LatentContextProvenance,
  type LatentExecutionProvenance,
} from "@/src/cognition/latent-v2/opportunity-constructor/provenance";
export {
  buildOpportunityConstructorPrompt,
  generateOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor";
