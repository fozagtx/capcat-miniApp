export interface OpenRouterChoice {
  message: { content: string };
}

export interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

let apiKey: string | null = null;

function getKey(): string {
  if (!apiKey) {
    apiKey = process.env.OPENROUTER_API_KEY ?? "";
  }
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return apiKey;
}

interface ChatParams {
  model?: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export async function chat(params: ChatParams): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    userMessage,
    maxTokens = 256,
    temperature = 0.3,
  } = params;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000",
      "X-Title": "capcat",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenRouter");
  }
  return content;
}
