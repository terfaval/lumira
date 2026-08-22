import type {
  ObservationV2Repository,
  ObservationV3AuthorityRepository,
} from "@/src/domain/observation/contracts";
import type {
  NativeObservationReadRequest,
  NativeObservationReadResult,
  ObservationNativeReadRepository,
} from "@/src/domain/observation/native-read";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createObservationV3Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v3-repository";
import { resolveObservationRuntimeAuthorityMode } from "@/src/runtime/orchestration/resolve-observation-runtime-authority-mode";

interface ObservationNativeReadRepositories {
  observationV2Repository: ObservationV2Repository;
  observationV3Repository: ObservationV3AuthorityRepository;
}

class NativeObservationReadStore implements ObservationNativeReadRepository {
  constructor(private readonly repositories: ObservationNativeReadRepositories) {}

  async getByReflectiveObjectId(request: NativeObservationReadRequest): Promise<NativeObservationReadResult | null> {
    const resolution = request.resolution;

    if (resolution === "explicit_v3") {
      const native = await this.repositories.observationV3Repository.getByReflectiveObjectId(
        request.reflectiveObjectId,
        request.userId,
      );

      return native ? { family: "v3", native } : null;
    }

    if (resolution === "explicit_v2" || resolution === "default_v2") {
      const native = await this.repositories.observationV2Repository.getByReflectiveObjectId(
        request.reflectiveObjectId,
        request.userId,
      );

      return native ? { family: "v2", native } : null;
    }

    if (resolveObservationRuntimeAuthorityMode() === "v3") {
      const nativeV3 = await this.repositories.observationV3Repository.getByReflectiveObjectId(
        request.reflectiveObjectId,
        request.userId,
      );
      if (nativeV3) {
        return { family: "v3", native: nativeV3 };
      }
    }

    const native = await this.repositories.observationV2Repository.getByReflectiveObjectId(
      request.reflectiveObjectId,
      request.userId,
    );

    return native ? { family: "v2", native } : null;
  }
}

export function createObservationNativeReadStore(
  repositories?: Partial<ObservationNativeReadRepositories>,
): ObservationNativeReadRepository {
  return new NativeObservationReadStore({
    observationV2Repository: repositories?.observationV2Repository ?? createObservationV2Repository(),
    observationV3Repository: repositories?.observationV3Repository ?? createObservationV3Repository(),
  });
}
