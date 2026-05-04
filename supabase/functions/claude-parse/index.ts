import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY ikke konfigureret" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { kind, text, image } = body as {
      kind: "docx" | "image";
      text?: string;
      image?: { mediaType: string; base64: string };
    };

    const systemPrompt =
      "You are a document parser. Extract all content from the document clearly and structured. " +
      "Preserve tables as GitHub-Flavored Markdown tables. Use proper headings (##, ###). " +
      "Highlight key dates, numbers, and action items in **bold**. " +
      "Return ONLY the parsed markdown — no preamble, no explanation. Respond in the same language as the source.";

    let userContent: any;
    if (kind === "image") {
      if (!image?.base64) {
        return new Response(JSON.stringify({ error: "Manglende billed-data" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userContent = [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
        { type: "text", text: "Parse this image and return clean structured markdown." },
      ];
    } else {
      if (!text) {
        return new Response(JSON.stringify({ error: "Manglende dokument-tekst" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userContent = [{ type: "text", text }];
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message ?? "Claude API fejl", details: data }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markdown = (data?.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n\n");

    return new Response(JSON.stringify({ markdown }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Ukendt fejl" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});