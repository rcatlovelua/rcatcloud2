// api/chat.js
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { model, messages, user_id, system_prompt } = req.body;

        // Валидация
        if (!model) {
            return res.status(400).json({ error: 'Model is required' });
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Проверяем, имеет ли пользователь доступ к модели
        const hasAccess = await checkUserAccess(user_id, model);
        if (!hasAccess) {
            return res.status(403).json({ 
                error: 'You don\'t have access to this model. Upgrade to Plus!' 
            });
        }

        // Определяем провайдера
        let response;
        if (model.startsWith('gemini-')) {
            response = await callGemini(model, messages, system_prompt);
        } else if (model.startsWith('gpt-') || model.startsWith('claude-')) {
            response = await callLLM7(model, messages, system_prompt);
        } else {
            return res.status(400).json({ error: 'Unsupported model' });
        }

        return res.status(200).json(response);

    } catch (error) {
        console.error('Chat API Error:', error);
        return res.status(500).json({ 
            error: error.message || 'Internal server error' 
        });
    }
}

// Проверка доступа пользователя
async function checkUserAccess(userId, model) {
    try {
        // Проверяем через ваш API
        const response = await fetch(`https://orrcs.vercel.app/api/getUser?id=${userId}`);
        const userData = await response.json();

        if (!userData.exists) {
            return false;
        }

        // Список Plus моделей
        const plusModels = [
            'gemini-2.0-pro',
            'gemini-1.5-pro',
            'gpt-4o',
            'claude-3.5-sonnet'
        ];

        // Если модель Plus, проверяем подписку
        if (plusModels.includes(model)) {
            return userData.has_plus === true;
        }

        return true;
    } catch (error) {
        console.error('User access check error:', error);
        return false;
    }
}

// Gemini API
async function callGemini(model, messages, systemPrompt) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    // Формируем контент для Gemini
    const contents = [];
    
    // Добавляем системный промпт если есть
    if (systemPrompt) {
        contents.push({
            role: 'user',
            parts: [{ text: `System: ${systemPrompt}` }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'Understood.' }]
        });
    }

    // Добавляем историю сообщений
    messages.forEach(msg => {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        });
    });

    try {
       const response = await fetch(
         `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, // <-- Changed streamGenerateContent to generateContent
      {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: contents,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
            // ... safety settings remain the same
        })
    }
);
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(`Gemini Error: ${data.error.message}`);
        }

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Empty response from Gemini');
        }

        return {
            success: true,
            content: data.candidates[0].content.parts[0].text,
            model: model,
            provider: 'gemini',
            usage: data.usageMetadata || null
        };
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(`Gemini API: ${error.message}`);
    }
}

// LLM7 API (GPT, Claude)
async function callLLM7(model, messages, systemPrompt) {
    const LLM7_API_KEY = process.env.LLM7_API_KEY;
    
    if (!LLM7_API_KEY) {
        throw new Error('LLM7 API key not configured');
    }

    // Формируем сообщения для OpenAI-совместимого API
    const formattedMessages = [];
    
    if (systemPrompt) {
        formattedMessages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    messages.forEach(msg => {
        formattedMessages.push({
            role: msg.role,
            content: msg.content
        });
    });

    try {
        const response = await fetch('https://api.llm7.io/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LLM7_API_KEY}`
            },
            body: JSON.stringify({
                model: model,
                messages: formattedMessages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`LLM7 Error: ${data.error.message}`);
        }

        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Empty response from LLM7');
        }

        return {
            success: true,
            content: data.choices[0].message.content,
            model: model,
            provider: 'llm7',
            usage: data.usage || null
        };
    } catch (error) {
        console.error('LLM7 API Error:', error);
        throw new Error(`LLM7 API: ${error.message}`);
    }
}
