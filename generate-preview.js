/**
 * api/generate-preview.js
 * ------------------------------------------------------------
 * Backend endpoint for the Scalebusiness "AI Preview Tool".
 *
 * WHY THIS FILE HAS TO EXIST SEPARATELY FROM index.html:
 * Your website's HTML/CSS/JS runs in every visitor's browser,
 * where anyone can view the source. If your Anthropic API key
 * lived in index.html, every visitor could steal it and run up
 * your bill. So the key lives here instead — on a server only
 * you control — and index.html just calls this endpoint.
 *
 * WHERE TO DEPLOY THIS:
 * This file is written in the "Vercel Serverless Function"
 * format, which is the fastest way to get something like this
 * live with no server to manage:
 *   1. Put this file at:  /api/generate-preview.js  in a new
 *      (or existing) Vercel project that also hosts index.html.
 *   2. In the Vercel dashboard: Project Settings -> Environment
 *      Variables -> add ANTHROPIC_API_KEY with your real key
 *      from https://console.anthropic.com/
 *   3. Deploy. Your endpoint will live at:
 *      https://yourdomain.com/api/generate-preview
 *   4. In index.html, set PREVIEW_API_ENDPOINT to that URL
 *      (or leave it as "/api/generate-preview" if the site and
 *      this function are deployed together on Vercel).
 *
 * Netlify and Cloudflare Workers work the same way, just with
 * a slightly different file location/export format — ask
 * Claude or your host's docs if you'd like that version instead.
 *
 * COST NOTE: every click of "Generate Preview" is a real API
 * call and costs a small amount (this uses Claude Haiku 4.5,
 * the fastest/most economical current model, specifically
 * because this is a lightweight, high-frequency, public-facing
 * feature). Consider adding basic rate-limiting per IP if this
 * page gets heavy public traffic.
 */

export default async function handler(req, res) {
  // --- CORS: lock this down to your real domain in production ---
  res.setHeader("Access-Control-Allow-Origin", "https://www.scalebusiness.com"); // TODO: your real domain
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 12) {
    return res.status(400).json({ error: "Please describe the website in a bit more detail." });
  }
  // Basic length guard against abuse
  const safePrompt = prompt.slice(0, 800);

  const systemPrompt = `You are a website concept assistant for Scalebusiness, a web design and marketing agency.
A potential customer will describe the website they want in their own words.
Respond with ONLY a raw JSON object (no markdown fences, no preamble) matching exactly this shape:
{
  "headline": string (max 8 words, punchy, specific to their business),
  "tagline": string (max 18 words, one sentence),
  "aboutSnippet": string (max 28 words, a short "About" blurb in their voice),
  "highlights": string[] (3 short value props/features, 2-4 words each, e.g. ["Same-Day Delivery","Family Owned","Custom Orders"]),
  "ctaLabel": string (max 3 words, e.g. "Order Now", "Book a Table"),
  "domainPreview": string (a plausible lowercase domain-style guess like "yourbakery.com", no real domains),
  "pages": string[] (3-5 page names appropriate to their business, e.g. ["Home","Menu","Our Story","Contact"]),
  "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" }
    (a vibrant, cohesive 3-color palette that matches the mood they described)
}
Do not include any text outside the JSON object.`;

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // fast + economical; swap to "claude-sonnet-5" for higher-quality copy
        max_tokens: 650,
        system: systemPrompt,
        messages: [{ role: "user", content: safePrompt }]
      })
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", anthropicResponse.status, errText);
      return res.status(502).json({ error: "Concept generation is temporarily unavailable." });
    }

    const data = await anthropicResponse.json();
    const textBlock = (data.content || []).find((block) => block.type === "text");
    if (!textBlock) {
      return res.status(502).json({ error: "No content returned." });
    }

    let concept;
    try {
      // Strip stray markdown fences just in case the model adds them
      const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
      concept = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse concept JSON:", textBlock.text);
      return res.status(502).json({ error: "Could not parse the generated concept." });
    }

    return res.status(200).json(concept);
  } catch (err) {
    console.error("generate-preview error:", err);
    return res.status(500).json({ error: "Something went wrong generating your preview." });
  }
}
