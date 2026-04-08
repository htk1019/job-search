import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

type Provider = 'gemini' | 'openai';

interface AiResponse {
  text: string;
}

function getProvider(): { provider: Provider; geminiKey?: string; openaiKey?: string } {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) return { provider: 'gemini', geminiKey };
  if (openaiKey) return { provider: 'openai', openaiKey };
  throw new Error('GEMINI_API_KEY 또는 OPENAI_API_KEY를 .env.local에 설정해주세요');
}

export function getProviderName(): string {
  const { provider } = getProvider();
  return provider === 'gemini' ? 'Gemini' : 'OpenAI';
}

export async function generateText(prompt: string): Promise<AiResponse> {
  const { provider, geminiKey, openaiKey } = getProvider();

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(geminiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return { text: result.response.text() };
  } else {
    const openai = new OpenAI({ apiKey: openaiKey! });
    const result = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    return { text: result.choices[0]?.message?.content || '' };
  }
}

export async function generateJson(prompt: string): Promise<AiResponse> {
  const { provider, geminiKey, openaiKey } = getProvider();

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(geminiKey!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
    return { text: result.response.text() };
  } else {
    const openai = new OpenAI({ apiKey: openaiKey! });
    const result = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt + '\n\nReturn ONLY valid JSON, no markdown or extra text.' }],
      response_format: { type: 'json_object' },
    });
    return { text: result.choices[0]?.message?.content || '{}' };
  }
}
