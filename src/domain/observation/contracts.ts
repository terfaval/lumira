import type {
  CreateObservationInput,
  Observation,
  ObservationListQuery,
} from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ObservationId, UserId } from "@/src/shared/types";

export interface ObservationRepository {
  create(input: CreateObservationInput): Promise<Observation>;
  listByReflectiveObject(query: ObservationListQuery): Promise<Observation[]>;
  getById(id: ObservationId, userId: UserId): Promise<Observation | null>;
}

export interface ObservationV2GetOptions {
  includeArchived?: boolean;
}

export interface ObservationV2Repository {
  create(bundle: ObservationV2Bundle): Promise<ObservationV2Bundle>;
  getByBundleId(bundleId: string, userId: UserId, options?: ObservationV2GetOptions): Promise<ObservationV2Bundle | null>;
  getByReflectiveObjectId(
    reflectiveObjectId: string,
    userId: UserId,
    options?: ObservationV2GetOptions,
  ): Promise<ObservationV2Bundle | null>;
  archive(bundleId: string, userId: UserId): Promise<ObservationV2Bundle | null>;
}
