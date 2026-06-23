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

    // Fetch fresh department list
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: depts, error: deptErr } = await supabase
      .from("departments").select("name").order("name");
    if (deptErr) {
      return new Response(JSON.stringify({ error: "Kunne ikke hente afdelinger: " + deptErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const deptNames = (depts ?? []).map((d: any) => d.name).filter(Boolean);
    const deptList = deptNames.map((n: string) => `- ${n}`).join("\n") || "(ingen afdelinger)";

    const systemPrompt =
      `Du er en assistent, der hjælper med at oprette procesbeskrivelser. Du modtager en rå, talt beskrivelse på dansk samt en liste over gyldige afdelinger. Udtræk og strukturér indholdet i følgende felter. Svar KUN med gyldig JSON, uden forklaring eller markdown:\n\n` +
      `- procesnavn (kort, sigende titel)\n` +
      `- afdeling (vælg det bedst matchende navn fra den medsendte afdelingsliste — også hvis brugeren bruger et dansk synonym for et engelsk afdelingsnavn, fx "inkasso", "kreditvurdering", "kundeservice")\n` +
      `- ansvarlig (navn eller rolle, hvis nævnt — ellers tom)\n` +
      `- beskrivelse (kort opsummering af processen)\n` +
      `- trin (array af enkeltstående trin i rækkefølge)\n\n` +
      `Hvis et felt ikke fremgår, sæt det til tom streng eller tom liste. Hvis ingen afdeling matcher tydeligt, lad afdeling være tom — opfind aldrig en afdeling der ikke står på listen. Ret åbenlyse transskriptionsfejl i fagtermer og afdelingsnavne ud fra konteksten.\n\n` +
      `Gyldige afdelinger:\n${deptList}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { /* keep empty */ }

    const result = {
      procesnavn: typeof parsed.procesnavn === "string" ? parsed.procesnavn : "",
      afdeling: typeof parsed.afdeling === "string" ? parsed.afdeling : "",
      ansvarlig: typeof parsed.ansvarlig === "string" ? parsed.ansvarlig : "",
      beskrivelse: typeof parsed.beskrivelse === "string" ? parsed.beskrivelse : "",
      trin: Array.isArray(parsed.trin) ? parsed.trin.filter((t: any) => typeof t === "string") : [],
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