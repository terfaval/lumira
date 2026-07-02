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
export { composeOpportunityConstructorInputPacket } from "@/src/cognition/latent-v2/opportunity-constructor/input-packet-composer";
export {
  buildOpportunityConstructorPrompt,
  generateOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor/llm-opportunity-constructor";
