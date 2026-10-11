import { gateCookie, isOpen, passwordMatches, readNotes } from "../server/wish-book.js";

const noStore = { "Cache-Control": "no-store" };

function closed() {
  return Response.json({ ok: false }, { status: 401, headers: noStore });
}

export async function GET(request) {
  if (!isOpen(request)) return closed();
  try {
    return Response.json({ ok: true, notes: await readNotes() }, { headers: noStore });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false }, { status: 500, headers: noStore });
  }
}

export async function POST(request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return closed();
  }

  if (!passwordMatches(input?.password ?? "")) return closed();

  try {
    const notes = await readNotes();
    return Response.json(
      { ok: true, notes },
      { headers: { ...noStore, "Set-Cookie": gateCookie(request) } }
    );
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false }, { status: 500, headers: noStore });
  }
}
