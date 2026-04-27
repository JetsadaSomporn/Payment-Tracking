import { z } from "zod";
import type { SlipExtractionResult } from "@/lib/types";

export const slipExtractionSchema = z.object({
  document_type: z.enum(["thai_bank_slip", "receipt", "unknown"]).default("unknown"),
  bank_name: z.string().nullable().optional(),
  status: z.enum(["success", "failed", "unknown"]).default("unknown"),
  amount: z.number().nullable().optional(),
  fee: z.number().nullable().optional(),
  currency: z.literal("THB").default("THB"),
  transaction_date_iso: z.string().nullable().optional(),
  transaction_time: z.string().nullable().optional(),
  sender_name: z.string().nullable().optional(),
  receiver_name: z.string().nullable().optional(),
  receiver_account_hint: z.string().nullable().optional(),
  reference_no: z.string().nullable().optional(),
  raw_text: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.5),
});

type SlipExtractionJson = z.infer<typeof slipExtractionSchema>;

export function toSlipExtractionResult(
  data: SlipExtractionJson,
): SlipExtractionResult {
  return {
    documentType: data.document_type || "unknown",
    bankName: data.bank_name || null,
    status: data.status || "unknown",
    amount: data.amount || null,
    fee: data.fee || 0,
    currency: data.currency || "THB",
    transactionDateIso: data.transaction_date_iso || null,
    transactionTime: data.transaction_time || null,
    senderName: data.sender_name || null,
    receiverName: data.receiver_name || null,
    receiverAccountHint: data.receiver_account_hint || null,
    referenceNo: data.reference_no || null,
    rawText: data.raw_text || "",
    confidence: data.confidence ?? 0.5,
  };
}

export async function processSlipImage(
  base64Image: string,
  mimeType: string,
): Promise<SlipExtractionResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseUrl = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  
  if (!apiKey || apiKey.includes("...") || apiKey.startsWith("replace-")) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  // ── SINGLE STEP: Vision directly to JSON ────────────────────────────────
  // Using Llama 3.2 Vision to perform both OCR and Structuring in one call.
  // This avoids the double-latency that caused the 300s timeouts.
  const visionModel = "meta/llama-3.2-11b-vision-instruct";
  console.log(`[ai-process] Unified extraction with ${visionModel}`);
  
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
              text: "Extract Thai bank slip data into JSON. Output ONLY the JSON object. " +
                    "Schema: {document_type, bank_name, status, amount, fee, currency, transaction_date_iso, transaction_time, sender_name, receiver_name, reference_no, confidence}",
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
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `AI extraction failed (${response.status})`);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned no content");

  // Parse the structured response
  try {
    const jsonStr = content.includes("```json") 
      ? content.split("```json")[1].split("```")[0] 
      : content;
    
    const rawJson = parseJsonObject(jsonStr);
    
    // ── Data Sanitization ────────────────────────────────────────────────
    // AI sometimes sends string "high" or "0.9" instead of number. Fix it.
    if (typeof rawJson.confidence === "string") {
      rawJson.confidence = rawJson.confidence.toLowerCase() === "high" ? 0.95 : 0.5;
    }
    
    // Ensure document_type matches enum exactly
    if (rawJson.document_type && !["thai_bank_slip", "receipt", "unknown"].includes(rawJson.document_type)) {
      rawJson.document_type = rawJson.document_type.includes("bank") ? "thai_bank_slip" : "unknown";
    }

    // Ensure status matches enum
    if (rawJson.status && !["success", "failed", "unknown"].includes(rawJson.status)) {
      rawJson.status = rawJson.status === "paid" || rawJson.status === "success" ? "success" : "unknown";
    }

    const parsed = slipExtractionSchema.parse({
      ...rawJson,
      raw_text: rawJson.raw_text || "Unified vision extraction",
    });
    
    return toSlipExtractionResult(parsed);
  } catch (err) {
    console.error("[ai-process] Extraction parse failed. Content:", content);
    console.error("[ai-process] Validation error:", err);
    throw new Error("AI returned data in an invalid format. Please try again.");
  }
}

// Keep this for potential fallback or manual text processing
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
            "Extract Thai payment slip data. Return ONLY valid JSON matching the schema.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Convert this OCR text to JSON: " +
                '{"document_type":"thai_bank_slip|receipt|unknown","bank_name":string|null,"status":"success|failed|unknown","amount":number|null,"fee":number|null,"currency":"THB","transaction_date_iso":"YYYY-MM-DD"|null,"transaction_time":"HH:mm"|null,"sender_name":string|null,"receiver_name":string|null,"receiver_account_hint":string|null,"reference_no":string|null,"raw_text":string,"confidence":number}' +
                `\n\nOCR text:\n${rawText}`,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      // REMOVED thinking and reasoning_effort - THESE WERE THE MAIN CAUSE OF SLOWNESS
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
    // 1. Clean up common AI markdown/noise
    let cleanContent = content.trim();
    if (cleanContent.includes("```")) {
      const match = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanContent = match[1];
    }

    // 2. Try standard parse
    try {
      return JSON.parse(cleanContent);
    } catch (e) {
      // 3. AI sent "JS Object" style (no quotes on keys). Let's try to fix it.
      // This regex attempts to add double quotes to unquoted keys
      const fixedJson = cleanContent
        .replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"');
      return JSON.parse(fixedJson);
    }
  } catch (err) {
    console.error("[ai-process] Final JSON parse attempt failed:", content);
    throw new Error("AI returned data in an invalid format.");
  }
}
