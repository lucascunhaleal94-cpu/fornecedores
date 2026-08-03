import { supabase } from './supabase';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: string;
}

export async function askOpenAI(prompt: string, systemPrompt?: string, options?: { max_tokens?: number, temperature?: number, response_format?: any }) {
  try {
    const { data, error } = await supabase.functions.invoke('openai', {
      body: {
        prompt,
        systemPrompt,
        max_tokens: options?.max_tokens,
        temperature: options?.temperature,
        response_format: options?.response_format
      }
    });

    if (error) {
       console.error("Erro ao chamar Edge Function:", error);
       throw error;
    }

    const aiResponse = data as OpenAIResponse;
    if (aiResponse.error) {
       throw new Error(aiResponse.error);
    }

    return aiResponse.choices[0].message.content;
  } catch (err: any) {
    console.error("OpenAI Service Error:", err);
    throw new Error(err.message || 'Falha ao comunicar com a inteligência artificial.');
  }
}
