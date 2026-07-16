// Voyage AI embeddings — Claude has no embeddings endpoint, so this is the one
// external model in Vira. All current Voyage models output 1024 dims.

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3.5-lite';
export const EMBED_DIMS = 1024;

/**
 * Embed a single string. `input_type` should be "document" for stored items and
 * "query" for a search query (Voyage tunes the two differently). Returns null on
 * any failure (missing key, API error) so callers can degrade gracefully — capture
 * still works without an embedding, the item just isn't semantically searchable.
 */
export async function embed(text: string, inputType: 'document' | 'query'): Promise<number[] | null> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key || !text.trim()) return null;

  try {
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: text, model: MODEL, input_type: inputType }),
    });
    if (!res.ok) {
      console.error('Voyage embed failed:', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const vector = json?.data?.[0]?.embedding;
    return Array.isArray(vector) && vector.length === EMBED_DIMS ? vector : null;
  } catch (e) {
    console.error('Voyage embed error:', e);
    return null;
  }
}
