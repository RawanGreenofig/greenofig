const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const SYSTEM_PROMPT = `You are GreenoFig's AI Health Coach - a friendly, knowledgeable, and supportive wellness assistant. Your role is to help users achieve their health and fitness goals.

Guidelines:
- Be warm, encouraging, and motivational
- Provide practical, actionable advice on nutrition, fitness, sleep, and wellness
- Keep responses concise but informative (2-4 paragraphs max)
- Use bullet points for lists when appropriate
- Always encourage users to consult healthcare professionals for medical concerns
- Be culturally sensitive and supportive of various dietary preferences
- Celebrate user progress and achievements
- Ask follow-up questions to better understand user needs

Topics you can help with:
- Meal planning and nutrition advice
- Workout recommendations and exercise tips
- Sleep improvement strategies
- Stress management and mental wellness
- Weight management guidance
- Healthy habit formation
- Hydration and supplement information

Remember: You're a coach, not a doctor. Always recommend professional medical advice for health concerns.`

export async function generateAIResponse(userMessage, conversationHistory = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  // Build conversation context
  const contents = []

  // Add system instruction as first user message
  contents.push({
    role: 'user',
    parts: [{ text: SYSTEM_PROMPT }]
  })
  contents.push({
    role: 'model',
    parts: [{ text: 'I understand. I am GreenoFig\'s AI Health Coach, ready to help users with their health and wellness journey in a friendly and supportive way.' }]
  })

  // Add conversation history
  for (const msg of conversationHistory) {
    contents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  })

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Gemini API error:', error)
      throw new Error(error.error?.message || 'Failed to generate response')
    }

    const data = await response.json()

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text
    }

    throw new Error('No response generated')
  } catch (error) {
    console.error('Error calling Gemini API:', error)
    throw error
  }
}
