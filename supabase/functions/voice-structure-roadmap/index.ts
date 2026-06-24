import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY mangler" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return new Response(JSON.stringify({ error: "Manglende transskription" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: depts }, { data: procs }] = await Promise.all([
      supabase.from("departments").select("name").order("name"),
      supabase.from("processes").select("id, title, department_id").is("deleted_at", null).order("title"),
    ]);

    const deptNames = (depts ?? []).map((d: any) => d.name).filter(Boolean);
    const deptList = deptNames.map((n: string) => `- ${n}`).join("\n") || "(ingen afdelinger)";

    // Build process list with optional department label
    const deptById = new Map<string, string>();
    // We need department name per id — fetch ids referenced
    const deptIds = Array.from(new Set((procs ?? []).map((p: any) => p.department_id).filter(Boolean)));
    if (deptIds.length) {
      const { data: deptRows } = await supabase
        .from("departments").select("id, name").in("id", deptIds);
      (deptRows ?? []).forEach((d: any) => deptById.set(d.id, d.name));
    }
    const procList = (procs ?? []).map((p: any) => {
      const d = p.department_id ? deptById.get(p.department_id) : null;
      return `- ${p.id} | ${p.title}${d ? ` (${d})` : ""}`;
    }).join("\n") || "(ingen processer)";

    const systemPrompt =
      `Du er en assistent, der hjælper med at strukturere et roadmap ud fra en talt dansk beskrivelse. ` +
      `Du modtager en rå transskription samt lister over gyldige afdelinger og eksisterende processer. ` +
      `Svar KUN med gyldig JSON. Ingen markdown, ingen forklaring, ingen \`\`\`-fences.\n\n` +
      `JSON-skema:\n` +
      `{\n` +
      `  "name": string,\n` +
      `  "description": string | null,\n` +
      `  "column_type": "quarters" | "steps" | "months" | "custom",\n` +
      `  "columns": [{ "label": string }],\n` +
      `  "cards": [\n` +
      `    {\n` +
      `      "column_label": string,\n` +
      `      "title": string,\n` +
      `      "status": "completed" | "in_progress" | "planned" | string | null,\n` +
      `      "description": string | null,\n` +
      `      "process_match": string | null\n` +
      `    }\n` +
      `  ]\n` +
      `}\n\n` +
      `Retningslinjer:\n` +
      `- Udled column_type: nævner brugeren kvartaler → "quarters"; "trin"/"step" → "steps"; måneder → "months"; ellers "custom".\n` +
      `- Opret KUN de kolonner brugeren faktisk nævner eller tydeligt implicerer — ikke flere.\n` +
      `- Hvert korts column_label SKAL matche en label i columns nøjagtigt.\n` +
      `- Hvis det er uklart hvilken kolonne et kort hører til, placér det i første kolonne.\n` +
      `- process_match: sæt KUN til id'et fra proceslisten, hvis kortets indhold tydeligt svarer til en eksisterende proces. Ellers null. Gæt aldrig.\n` +
      `- Udled status: "færdig"/"done" → completed; "i gang"/"igang"/"undervejs" → in_progress; "planlagt"/"kommende"/"skal" → planned; ellers null.\n` +
      `- Bevar brugerens egne formuleringer i titler og beskrivelser. Ret kun åbenlyse transskriptionsfejl.\n\n` +
      `Gyldige afdelinger:\n${deptList}\n\n` +
      `Eksisterende processer (format: id | titel (afdeling)):\n${procList}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "For mange forespørgsler — prøv igen om et øjeblik." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI-credits opbrugt. Tilføj credits i workspace-indstillingerne." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `AI-fejl (${resp.status}): ${txt}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "{}";

    // Robust parse: strip ```json fences if any slipped through
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let parsed: any = null;
    try { parsed = JSON.parse(stripped); } catch { /* keep null */ }

    if (!parsed || typeof parsed !== "object") {
      return new Response(JSON.stringify({ error: "Kunne ikke fortolke AI-svar som JSON.", raw }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalise
    const validColTypes = new Set(["quarters", "steps", "months", "custom"]);
    const procIds = new Set((procs ?? []).map((p: any) => p.id));
    const columns = Array.isArray(parsed.columns)
      ? parsed.columns
          .map((c: any) => ({ label: typeof c?.label === "string" ? c.label.trim() : "" }))
          .filter((c: any) => c.label)
      : [];
    const labelSet = new Set(columns.map((c: any) => c.label));
    const firstLabel = columns[0]?.label ?? null;

    const cards = Array.isArray(parsed.cards)
      ? parsed.cards.map((c: any) => {
          const colLabel = typeof c?.column_label === "string" && labelSet.has(c.column_label)
            ? c.column_label
            : firstLabel;
          const match = typeof c?.process_match === "string" && procIds.has(c.process_match)
            ? c.process_match
            : null;
          return {
            column_label: colLabel,
            title: typeof c?.title === "string" ? c.title : "",
            status: typeof c?.status === "string" ? c.status : null,
            description: typeof c?.description === "string" ? c.description : null,
            process_match: match,
          };
        }).filter((c: any) => c.title && c.column_label)
      : [];

    const result = {
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "Nyt roadmap",
      description: typeof parsed.description === "string" ? parsed.description : null,
      column_type: validColTypes.has(parsed.column_type) ? parsed.column_type : "custom",
      columns,
      cards,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});