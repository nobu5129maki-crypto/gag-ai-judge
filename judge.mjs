import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const { gag } = body;

  if (!gag || typeof gag !== 'string') {
    return res.status(400).json({ error: 'ギャグを入力してください' });
  }

  const trimmedGag = gag.trim();
  if (trimmedGag.length === 0) {
    return res.status(400).json({ error: 'ギャグを入力してください' });
  }

  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'APIキーが設定されていません。Vercelの環境変数にGOOGLE_API_KEYを設定してください。',
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `以下のギャグを採点してください：「${trimmedGag}」`,
      config: {
        systemInstruction: `あなたはお笑いのプロ審査員です。ユーザーが入力したギャグを0〜100点で採点し、短いコメントを返してください。
必ず以下のJSON形式のみで回答してください（他のテキストは含めない）:
{"score": 数字0-100, "comment": "採点コメント（20文字以内）"}`,
        temperature: 0.7,
      },
    });

    const textContent = response?.text ?? '';

    let result;
    try {
      const parsed = JSON.parse((textContent || '{}').replace(/```json\n?|\n?```/g, '').trim());
      result = {
        score: Math.min(100, Math.max(0, parseInt(parsed.score, 10) || 50)),
        comment: (parsed.comment || '採点しました').slice(0, 50),
      };
    } catch {
      result = { score: 50, comment: '採点しました' };
    }

    res.json(result);
  } catch (err) {
    console.error('Google AI API Error:', err);
    res.status(500).json({
      error: 'AI判定中にエラーが発生しました',
      detail: err.message || String(err),
    });
  }
}
