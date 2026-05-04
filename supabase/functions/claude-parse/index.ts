const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { kind, text, image, documentMarkdown, rules, title } = body as {
      kind: "docx" | "image" | "improve";
      text?: string;
      image?: { mediaType: string; base64: string };
      documentMarkdown?: string;
      rules?: string;
      title?: string;
    };

    let systemPrompt: string;
    let userContent: any;

    if (kind === "improve") {
      if (!documentMarkdown) {
        return new Response(JSON.stringify({ error: "Manglende dokument-indhold" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rulesBlock = (rules && rules.trim().length > 0) ? rules : "(ingen regler defineret)";
      systemPrompt =
        "You are a document parser and process improver.\n\n" +
        "KNOWLEDGE BASE RULES:\n" + rulesBlock + "\n\n" +
        "Task: Parse the uploaded document AND apply the above rules to suggest improvements.\n" +
        "Present the result in two clearly labeled sections:\n" +
        "1. **Parsed document** — structured extraction with tables preserved as GitHub-Flavored Markdown tables\n" +
        "2. **Suggested improvements** — based on the knowledge base rules\n\n" +
        "Respond in Danish. Return ONLY markdown — no preamble, no explanation.";
      const titleLine = title ? `Title: ${title}\n\n` : "";
      userContent = [{ type: "text", text: `${titleLine}Document:\n\n${documentMarkdown}` }];
    } else {
      systemPrompt =
        "You are a document parser. Extract all content from the document clearly and structured. " +
        "Preserve tables as GitHub-Flavored Markdown tables. Use proper headings (##, ###). " +
        "Highlight key dates, numbers, and action items in **bold**. " +
        "Return ONLY the parsed markdown — no preamble, no explanation. Respond in the same language as the source.";

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
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: kind === "improve" ? 12000 : 8000,
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