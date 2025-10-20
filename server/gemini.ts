import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ConversationContext {
  userId: string;
  message: string;
  history: Array<{ message: string; aiResponse: string }>;
}

export async function generateAIResponse(context: ConversationContext): Promise<string> {
  try {
    // Build conversation history for context
    let conversationPrompt = `You are a helpful AI support assistant for Mintrax AI platform. 
You help users with their questions about the platform, troubleshooting, and general support.
Be friendly, professional, and concise in your responses.

Previous conversation history:\n`;

    if (context.history && context.history.length > 0) {
      const recentHistory = context.history.slice(-5); // Last 5 exchanges for context
      recentHistory.forEach((exchange) => {
        conversationPrompt += `User: ${exchange.message}\nAssistant: ${exchange.aiResponse}\n\n`;
      });
    } else {
      conversationPrompt += "(No previous conversation)\n\n";
    }

    conversationPrompt += `Current user message: ${context.message}\n\nProvide a helpful response:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: conversationPrompt,
    });

    return response.text || "I apologize, but I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate AI response. Please try again later.");
  }
}
