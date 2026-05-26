import type {
  CreateObservationInput,
  Observation,
  ObservationListQuery,
} from "@/src/domain/observation/types";
import type { ObservationId, UserId } from "@/src/shared/types";

export interface ObservationRepository {
  create(input: CreateObservationInput): Promise<Observation>;
  listByReflectiveObject(query: ObservationListQuery): Promise<Observation[]>;
  getById(id: ObservationId, userId: UserId): Promise<Observation | null>;
}
