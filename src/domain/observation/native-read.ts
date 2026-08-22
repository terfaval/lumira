import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export type ObservationNativeFamily = "v2" | "v3";

export type ObservationNativeReadResolution =
  | "default_v2"
  | "explicit_v2"
  | "explicit_v3";

export interface ObservationV2NativeReadResult {
  family: "v2";
  native: ObservationV2Bundle;
}

export interface ObservationV3NativeReadResult {
  family: "v3";
  native: ObservationV3AuthorityRecord;
}

export type NativeObservationReadResult =
  | ObservationV2NativeReadResult
  | ObservationV3NativeReadResult;

export interface NativeObservationReadRequest {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  resolution?: ObservationNativeReadResolution;
}

export interface ObservationNativeReadRepository {
  getByReflectiveObjectId(request: NativeObservationReadRequest): Promise<NativeObservationReadResult | null>;
}

