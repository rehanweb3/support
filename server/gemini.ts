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
  faqKnowledge?: Array<{ question: string; answer: string }>;
}

export async function generateAIResponse(context: ConversationContext): Promise<string> {
  try {
    // Build conversation history for context
    let conversationPrompt = `You are a helpful AI support assistant for Mintrax AI platform. 
You help users with their questions about the platform, troubleshooting, and general support.
Be friendly, professional, and concise in your responses.
`;

    // Add FAQ knowledge if available
    if (context.faqKnowledge && context.faqKnowledge.length > 0) {
      conversationPrompt += `\nFAQ Knowledge Base:\n`;
      context.faqKnowledge.forEach((faq, index) => {
        conversationPrompt += `${index + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n\n`;
      });
      conversationPrompt += `Use this FAQ knowledge to answer user questions when relevant. If the user's question matches any FAQ, provide that answer but in a natural, conversational way.\n\n`;
    }

    conversationPrompt += `\nPrevious conversation history:\n`;

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

// Analyze PDF content and extract FAQ information
export async function analyzePdfContent(pdfUrl: string): Promise<Array<{ question: string; answer: string }>> {
  try {
    // Use Gemini's file API to analyze PDF
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Please analyze this PDF document at ${pdfUrl} and extract all FAQ (Frequently Asked Questions) information.
      
For each FAQ item, extract:
1. The question
2. The answer

Return the results in JSON format as an array of objects with "question" and "answer" fields.

Example format:
[
  {
    "question": "What is the platform about?",
    "answer": "The platform is a support ticketing system..."
  }
]

If the PDF is not accessible or doesn't contain FAQ information, return an empty array.`,
    });

    const text = response.text || "[]";
    
    // Try to parse the JSON response
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const faqs = JSON.parse(cleanedText);
      return Array.isArray(faqs) ? faqs : [];
    } catch (parseError) {
      console.error("Failed to parse PDF analysis result:", parseError);
      return [];
    }
  } catch (error) {
    console.error("PDF analysis error:", error);
    throw new Error("Failed to analyze PDF content. Please check the PDF URL and try again.");
  }
}

// Learn from user question and AI response to improve FAQ knowledge
export async function generateFaqFromConversation(
  question: string, 
  answer: string
): Promise<{ question: string; answer: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Based on this user question and AI answer, determine if this should be added to the FAQ knowledge base.

User Question: ${question}
AI Answer: ${answer}

If this is a commonly asked question that would be useful to save for future reference, return it in JSON format:
{
  "question": "Refined version of the user question",
  "answer": "Clear, concise answer"
}

If this is too specific, conversational, or not suitable for FAQ, return: { "shouldSave": false }

Only save questions that are:
- General platform or feature questions
- Troubleshooting common issues
- How-to questions
- Policy or procedure questions

Do NOT save:
- Personal questions
- Context-dependent questions
- Greetings or small talk
- Questions about specific user data`,
    });

    const text = response.text || '{ "shouldSave": false }';
    
    try {
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanedText);
      
      if (result.shouldSave === false) {
        return null;
      }
      
      return {
        question: result.question || question,
        answer: result.answer || answer
      };
    } catch (parseError) {
      console.error("Failed to parse FAQ generation result:", parseError);
      return null;
    }
  } catch (error) {
    console.error("FAQ generation error:", error);
    return null;
  }
}
