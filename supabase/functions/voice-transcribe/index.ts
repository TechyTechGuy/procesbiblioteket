const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY mangler" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inForm = await req.formData();
    const audio = inForm.get("audio");
    console.log("voice-transcribe: received", {
      hasAudio: !!audio,
      type: (audio as any)?.type,
      size: (audio as any)?.size,
    });
    if (!(audio instanceof File) && !(audio instanceof Blob)) {
      return new Response(JSON.stringify({ error: "Manglende audio-fil" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((audio as Blob).size < 1024) {
      return new Response(JSON.stringify({ error: "Optagelsen er tom — prøv igen" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const type = (audio as File).type || "audio/webm";
    const extMap: Record<string, string> = {
      "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3",
      "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg",
    };
    const ext = extMap[type.split(";")[0]] ?? "webm";

    const upstream = new FormData();
    upstream.append("file", audio, `recording.${ext}`);
    upstream.append("model", "openai/gpt-4o-transcribe");
    upstream.append("language", "da");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    const txt = await resp.text();
    console.log("voice-transcribe: gateway response", { status: resp.status, body: txt.slice(0, 500) });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Transskription fejlede (${resp.status}): ${txt}` }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any;
    try { data = JSON.parse(txt); } catch { data = { text: txt }; }
    return new Response(JSON.stringify({ text: data.text ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});