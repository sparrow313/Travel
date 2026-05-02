/**
 * Groq AI — Vision API + Structured Outputs
 * Uses meta-llama/llama-4-scout-17b-16e-instruct for image → structured JSON extraction.
 * No extra dependencies — just native fetch.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface DocumentExtraction {
  title: string;
  subtitle: string | null;
  date: string | null;
  endDate: string | null;
  referenceNumber: string | null;
  notes: string | null;
  type: "PASSPORT" | "VISA" | "FLIGHT" | "HOTEL" | "INSURANCE" | "TRAVEL_DOC" | "TRANSPORT" | "BUS" | "OTHER";
}

const EXTRACTION_SYSTEM_PROMPT = `You are a travel document data extractor. Given an image of a travel document (passport, boarding pass, hotel booking, visa, insurance, train/bus ticket, etc.), extract the structured fields.

Rules:
- Dates must be in YYYY-MM-DD format. If you see "14 Feb 2025" convert to "2025-02-14".
- If a field cannot be determined from the image, return null for that field.
- For "type", classify the document based on its content.
- Be concise — title should be short and descriptive.
- referenceNumber should capture booking refs, passport numbers, policy numbers, ticket numbers, PNR etc.
- notes should capture any extra useful info (seat numbers, terminals, gate, check-in times, conditions).

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "title": "string",
  "subtitle": "string or null",
  "date": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null",
  "referenceNumber": "string or null",
  "notes": "string or null",
  "type": "PASSPORT|VISA|FLIGHT|HOTEL|INSURANCE|TRAVEL_DOC|TRANSPORT|BUS|OTHER"
}`;

/**
 * Send a document image to Groq Vision (Llama 4 Scout) and get structured fields back.
 * Accepts either a public image URL or a base64-encoded image.
 */
export async function extractDocumentFromImage(
  imageInput: { url: string } | { base64: string; mimeType: string },
  documentTypeHint?: string,
): Promise<DocumentExtraction> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  // Build the image_url content part
  let imageUrl: string;
  if ("url" in imageInput) {
    imageUrl = imageInput.url;
  } else {
    imageUrl = `data:${imageInput.mimeType};base64,${imageInput.base64}`;
  }

  const userText = documentTypeHint
    ? `Extract all fields from this ${documentTypeHint.toLowerCase()} document image. Respond with JSON only.`
    : `Extract all fields from this travel document image. Respond with JSON only.`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_completion_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[Groq Vision] API error:", response.status, errorBody);
    throw new Error(`Groq Vision API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned empty response");
  }

  const parsed = JSON.parse(content) as DocumentExtraction;

  // Validate the type field
  const validTypes = ["PASSPORT", "VISA", "FLIGHT", "HOTEL", "INSURANCE", "TRAVEL_DOC", "TRANSPORT", "BUS", "OTHER"];
  if (!validTypes.includes(parsed.type)) {
    parsed.type = "OTHER";
  }

  return parsed;
}

/**
 * Send OCR text to Groq (text-only model) and get structured fields back.
 * Fallback option using gpt-oss-20b with JSON mode.
 */
export async function extractDocumentFromText(
  ocrText: string,
  documentTypeHint?: string,
): Promise<DocumentExtraction> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in environment variables");
  }

  const userMessage = documentTypeHint
    ? `Document type hint: ${documentTypeHint}\n\nOCR Text:\n${ocrText}\n\nRespond with JSON only.`
    : `OCR Text:\n${ocrText}\n\nRespond with JSON only.`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_completion_tokens: 512,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[Groq Text] API error:", response.status, errorBody);
    throw new Error(`Groq API error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned empty response");
  }

  const parsed = JSON.parse(content) as DocumentExtraction;

  const validTypes = ["PASSPORT", "VISA", "FLIGHT", "HOTEL", "INSURANCE", "TRAVEL_DOC", "TRANSPORT", "BUS", "OTHER"];
  if (!validTypes.includes(parsed.type)) {
    parsed.type = "OTHER";
  }

  return parsed;
}
