import Anthropic from "@anthropic-ai/sdk";
import type { ClassifyDeps } from "./classify";

/** Odstraní ```json ... ``` obal, kdyby ho model přidal. */
function stripFences(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : s).trim();
}

/** Produkční ClassifyDeps nad Anthropic SDK — model Haiku 4.5 (levná klasifikace). */
export function createClassifyDeps(apiKey: string): ClassifyDeps {
  const client = new Anthropic({ apiKey });
  return {
    async llmJson(system, user) {
      const resp = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = resp.content.find((b) => b.type === "text");
      if (!block || block.type !== "text") throw new Error("LLM: prázdná odpověď");
      return JSON.parse(stripFences(block.text));
    },
  };
}
