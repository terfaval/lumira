const baseUrl = process.env.BASE_URL || "http://localhost:3000";

const body = {
  preset_id: "lumira_stone_passage_v1",
  variant: "dawn",
  debug: true,
};

async function main() {
  const res = await fetch(`${baseUrl}/api/image/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text);
    process.exit(2);
  }

  console.log("HTTP", res.status);
  console.log(JSON.stringify(json, null, 2));

  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
