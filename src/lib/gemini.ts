import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set in .env.local');
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI;
}

export function getModel(modelName = 'gemini-2.0-flash'): GenerativeModel {
  return getGemini().getGenerativeModel({ model: modelName });
}
