export type {
  ExperimentalOpportunityConstructorGenerationResult,
  ExperimentalOpportunityConstructorInputPacket,
  ExperimentalOpportunityConstructorOutputPacket,
  ExperimentalOpportunityConstructorValidationResult,
  ValidatedExperimentalOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";

export {
  EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";
export {
  composeExperimentalOpportunityConstructorInput,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/packet";
export {
  parseExperimentalOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/parser";
export {
  validateExperimentalOpportunityConstructorOutput,
  parseAndValidateExperimentalOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/validator";
export {
  runExperimentalOpportunityConstructor,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/harness";
export {
  buildExperimentalOpportunityConstructorPrompt,
  generateExperimentalOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/llm-experimental-opportunity-constructor";
export {
  compareOpportunityConstructors,
  summarizeOpportunityConstructorComparison,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/comparison";
export {
  evaluateExperimentalOpportunityConstructorRegressionSuite,
  type ExperimentalOpportunityConstructorRegressionCase,
  type ExperimentalOpportunityConstructorRegressionCaseResult,
  type ExperimentalOpportunityConstructorRegressionSuiteResult,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/regression";
