import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createAdminRepository } from "@/src/infrastructure/supabase/repositories/create-admin-repository";
import type { ReaderBlock } from "@/src/features/meditation/lib/meditation-types";

const MEDITATIONS_DIR = join(process.cwd(), "data", "meditations");

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Missing authenticated user identity.",
      devFallbackHeader: DEV_FALLBACK_HEADER,
    },
    { status: 401 },
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      error: "Admin membership required.",
    },
    { status: 403 },
  );
}

function badRequestResponse(message: string) {
  return NextResponse.json(
    {
      error: message,
    },
    { status: 400 },
  );
}

function isReaderBlocks(value: unknown): value is ReaderBlock[] {
  return (
    Array.isArray(value) &&
    value.every((block) => {
      if (!block || typeof block !== "object") return false;
      if (!("type" in block) || typeof block.type !== "string") return false;
      if (block.type === "text") {
        return "content" in block && typeof block.content === "string" && "tone" in block && typeof block.tone === "string";
      }
      if (block.type === "pause") {
        return "duration_ms" in block && typeof block.duration_ms === "number";
      }
      return false;
    })
  );
}

async function findMeditationFileById(id: string) {
  const entries = await readdir(MEDITATIONS_DIR);
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const path = join(MEDITATIONS_DIR, entry);
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as { id?: unknown };
    if (parsed.id === id) {
      return { path, parsed: JSON.parse(raw) as Record<string, unknown> };
    }
  }
  return null;
}

export async function POST(request: Request) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const adminRepository = createAdminRepository();
  const membership = await adminRepository.getMembershipByUserId(user.userId);
  if (!membership) {
    return forbiddenResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequestResponse("Invalid JSON body.");
  }

  const id = body && typeof body === "object" && "id" in body ? body.id : null;
  const blocks = body && typeof body === "object" && "blocks" in body ? body.blocks : null;

  if (typeof id !== "string" || !id.trim()) {
    return badRequestResponse("Missing meditation id.");
  }

  if (!isReaderBlocks(blocks)) {
    return badRequestResponse("Invalid reader blocks payload.");
  }

  const meditationFile = await findMeditationFileById(id);
  if (!meditationFile) {
    return NextResponse.json({ error: "Meditation not found." }, { status: 404 });
  }

  const nextJson = {
    ...meditationFile.parsed,
    reader: {
      ...(typeof meditationFile.parsed.reader === "object" && meditationFile.parsed.reader ? meditationFile.parsed.reader : {}),
      blocks,
    },
  };

  await writeFile(meditationFile.path, `${JSON.stringify(nextJson, null, 2)}\n`, "utf-8");

  return NextResponse.json({
    status: "saved",
    id,
  });
}
