import { z } from "zod";
import type { SlipExtractionResult } from "@/lib/types";

export const slipExtractionSchema = z.object({
  document_type: z.enum(["thai_bank_slip", "receipt", "unknown"]),
  bank_name: z.string().nullable(),
  status: z.enum(["success", "failed", "unknown"]),
  amount: z.number().nullable(),
  fee: z.number().nullable(),
  currency: z.literal("THB"),
  transaction_date_iso: z.string().nullable(),
  transaction_time: z.string().nullable(),
  sender_name: z.string().nullable(),
  receiver_name: z.string().nullable(),
  receiver_account_hint: z.string().nullable(),
  reference_no: z.string().nullable(),
  raw_text: z.string(),
  confidence: z.number().min(0).max(1),
});

type SlipExtractionJson = z.infer<typeof slipExtractionSchema>;

export function toSlipExtractionResult(
  data: SlipExtractionJson,
): SlipExtractionResult {
  return {
    documentType: data.document_type,
    bankName: data.bank_name,
    status: data.status,
    amount: data.amount,
    fee: data.fee,
    currency: data.currency,
    transactionDateIso: data.transaction_date_iso,
    transactionTime: data.transaction_time,
    senderName: data.sender_name,
    receiverName: data.receiver_name,
    receiverAccountHint: data.receiver_account_hint,
    referenceNo: data.reference_no,
    rawText: data.raw_text,
    confidence: data.confidence,
  };
}

export async function processSlipImage(
  base64Image: string,
  mimeType: string,
): Promise<SlipExtractionResult> {
  const startTime = Date.now();
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseUrl = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  
  // Use a capable vision model that can also output JSON
  const visionModel = "meta/llama-3.2-11b-vision-instruct";
  
  if (!apiKey || apiKey.includes("...") || apiKey.startsWith("replace-")) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  console.log(`[ai-process] starting unified vision extraction with ${visionModel}`);
  const visionStart = Date.now();
  
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: visionModel,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract Thai bank slip data into JSON format. Return ONLY the JSON object. Fields: document_type (thai_bank_slip|receipt|unknown), bank_name, status (success|failed), amount (number), fee (number), currency (THB), transaction_date_iso (YYYY-MM-DD), transaction_time (HH:mm), sender_name, receiver_name, reference_no, confidence (0-1).",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            }
          ]
        }
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  const body = await response.json().catch(() => null) as NvidiaChatResponse | null;
  const visionEnd = Date.now();
  console.log(`[ai-process] unified extraction completed in ${visionEnd - visionStart}ms`);

  if (!response.ok) {
    const message = body?.error?.message ?? `NVIDIA unified extraction failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  const content = body?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("NVIDIA unified extraction returned no content");
  }

  try {
    const jsonStr = content.includes("```json") 
      ? content.split("```json")[1].split("```")[0] 
      : content;
    
    const parsed = slipExtractionSchema.parse({
      ...parseJsonObject(jsonStr),
      raw_text: "Unified vision extraction used",
    });
    
    console.log(`[ai-process] total time: ${Date.now() - startTime}ms`);
    return toSlipExtractionResult(parsed);
  } catch (err) {
    console.error("[ai-process] JSON parse failed, falling back to legacy two-step...");
    // Fallback logic if needed or just throw
    throw new Error("Failed to parse AI response into valid slip data");
  }
}

export async function extractSlipTextWithNvidiaDeepSeek(
  rawText: string,
): Promise<SlipExtractionResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseUrl = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  const model = process.env.NVIDIA_SLIP_MODEL ?? "deepseek-ai/deepseek-v4-flash";

  if (!apiKey || apiKey.includes("...") || apiKey.startsWith("replace-")) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Extract Thai payment slip data. Return only valid JSON matching the requested schema. Do not include markdown.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "อ่านข้อความ OCR จากสลิปนี้ แล้วตอบเป็น JSON เท่านั้นตาม schema นี้: " +
                '{"document_type":"thai_bank_slip|receipt|unknown","bank_name":string|null,"status":"success|failed|unknown","amount":number|null,"fee":number|null,"currency":"THB","transaction_date_iso":"YYYY-MM-DD"|null,"transaction_time":"HH:mm"|null,"sender_name":string|null,"receiver_name":string|null,"receiver_account_hint":string|null,"reference_no":string|null,"raw_text":string,"confidence":number}' +
                `\n\nOCR text:\n${rawText}`,
            },
          ],
        },
      ],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 4096,
      chat_template_kwargs: {
        thinking: true,
        reasoning_effort: "high",
      },
    }),
  });

  const body = await response.json().catch(() => null) as NvidiaChatResponse | null;

  if (!response.ok) {
    const message = body?.error?.message ?? `NVIDIA slip extraction failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  const content = body?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("NVIDIA slip extraction returned no content");
  }

  const parsed = slipExtractionSchema.parse(parseJsonObject(content));

  return toSlipExtractionResult(parsed);
}

type NvidiaChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("NVIDIA slip extraction did not return JSON");
    }

    return JSON.parse(match[0]);
  }
}
