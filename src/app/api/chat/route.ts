import { getCatalog, search } from "@/lib/data";

type Msg = { role: "user" | "assistant"; content: string };

const SITE_MAP = `Mtb Explorer pages:
- / : search box (gene, protein, compound, drug or trial)
- /gene/<id> : a bacterial gene: overview, resistance mutations, compounds tested against it, 3D protein structure
- /compound/<id> : a drug or experimental compound: overview, lab activity, resistance, clinical trials
- /trial/<nctId> : one clinical trial
- /graph?type=<gene|compound|mutation|trial>&id=<id> : relationship graph
- /sources : where the data comes from
- /about : about the project`;

function system(catalog: unknown) {
  return `You are the friendly assistant inside Mtb Explorer, a research portal linking Mycobacterium tuberculosis genes, proteins, compounds, drugs and clinical trials.
Talk like a helpful colleague in a chat: warm, natural, conversational. Answer follow-up questions using the earlier messages.
You can write a proper explanation when the user asks "what is" or "why" (a few short paragraphs, plain language, define jargon). For simple navigation questions keep it short.
Ground portal-specific claims in the catalog below. Link entities in markdown with the exact href, e.g. [Rv0678](/gene/Rv0678). Never invent portal data; if something isn't in the catalog, say so and suggest the closest thing that is.
General TB biology and drug-resistance background is fine to explain, but say when you're giving general background rather than portal data.
End most replies with a brief suggested next step or a question to keep the conversation going.
Never give medical or treatment advice for a patient. Data comes from public sources (UniProt, ChEMBL, PubChem, PDB, AlphaFold DB, ClinicalTrials.gov); the WHO resistance catalogue is not loaded yet.

${SITE_MAP}

Catalog (JSON): ${JSON.stringify(catalog)}`;
}

async function fallback(question: string) {
  const q = question.trim().toLowerCase();
  if (/^(hi|hello|hey|yo|hiya)\b/.test(q) || /where do i start|help|what can you do/.test(q))
    return "Hi! I can help you find your way around. You can ask me things like:\n- \"Show me bedaquiline\"\n- \"Which gene should I look at for rifampin resistance?\"\n- \"Where can I see a protein's 3D structure?\"\nWhat are you curious about?";
  const words = question.split(/[^A-Za-z0-9.-]+/).filter((w) => w.length > 2);
  const seen = new Map<string, { title: string; href: string; subtitle: string }>();
  for (const w of words) for (const h of (await search(w)).slice(0, 3)) seen.set(h.href, h);
  const hits = [...seen.values()].slice(0, 4);
  if (!hits.length)
    return "Hmm, I couldn't find that in the portal. Try a gene name (like Rv0678), a drug (like bedaquiline), or tell me what you're trying to find and I'll point you to the right page.";
  return `Here's what I found that fits:\n${hits.map((h) => `- [${h.title}](${h.href}): ${h.subtitle}`).join("\n")}\nWant me to explain any of these, or help you find something related?\n\n(I'm running in basic mode right now, so for fuller answers the site owner needs to connect the AI model.)`;
}

const enc = new TextEncoder();
const textResponse = (text: string) => new Response(text, { headers: { "content-type": "text/plain; charset=utf-8" } });

/** Streams Claude's reply as plain text, forwarding only the text deltas. */
function streamClaude(upstream: Response) {
  const reader = upstream.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  return new Response(new ReadableStream({
    async pull(ctrl) {
      const { done, value } = await reader.read();
      if (done) return ctrl.close();
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") ctrl.enqueue(enc.encode(ev.delta.text));
        } catch {}
      }
    },
    cancel() { reader.cancel(); },
  }), { headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(req: Request) {
  let messages: Msg[] = [];
  try {
    messages = ((await req.json()).messages ?? []) as Msg[];
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  messages = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  const last = messages.at(-1);
  if (!last || last.role !== "user") return Response.json({ error: "No question" }, { status: 400 });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return textResponse(await fallback(last.content));

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 900, stream: true, system: system(await getCatalog()), messages }),
    });
    if (!res.ok || !res.body) throw new Error(`Anthropic ${res.status}`);
    return streamClaude(res);
  } catch {
    return textResponse(await fallback(last.content));
  }
}
