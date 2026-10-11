import { parseWish, saveWish } from "../server/wish-book.js";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400, headers: noStore });
  }

  const entry = parseWish(input);
  if (!entry) return Response.json({ ok: false }, { status: 400, headers: noStore });

  try {
    await saveWish(entry);
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false }, { status: 500, headers: noStore });
  }

  return Response.json({ ok: true }, { headers: noStore });
}
