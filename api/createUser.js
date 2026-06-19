import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// CORS заголовки
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
    // Устанавливаем CORS заголовки для ВСЕХ ответов
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // Обработка preflight запроса (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Проверяем метод
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            ok: false, 
            error: 'Метод не поддерживается' 
        });
    }

    try {
        const { id, username, first_name } = req.body;

        console.log('📥 Получены данные:', { id, username, first_name });

        if (!id) {
            return res.status(400).json({ 
                ok: false, 
                error: 'Нет Telegram ID' 
            });
        }

        // Проверяем, существует ли пользователь
        const { data: existingUser, error: checkError } = await supabase
            .from('portal_users')
            .select('telegram_id, username, first_name')
            .eq('telegram_id', id)
            .single();

        // Игнорируем ошибку "не найдено" (это нормально)
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Ошибка проверки:', checkError);
            return res.status(500).json({ 
                ok: false, 
                error: 'Ошибка базы данных' 
            });
        }

        // Если пользователя НЕТ — создаём
        if (!existingUser) {
            console.log(`👤 Создаём новый аккаунт для Telegram ID: ${id}`);
            
            const { error: insertError } = await supabase
                .from('portal_users')
                .insert({
                    telegram_id: id,
                    username: username || `user_${id}`,
                    first_name: first_name || 'Пользователь',
                    has_plus: false,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                });

            if (insertError) {
                console.error('❌ Ошибка создания:', insertError);
                return res.status(500).json({ 
                    ok: false, 
                    error: 'Ошибка создания аккаунта: ' + insertError.message
                });
            }

            console.log(`✅ Аккаунт создан для ${username || id}`);
            return res.status(200).json({ 
                ok: true,
                created: true,
                message: 'Аккаунт успешно создан'
            });
        }

        // Если пользователь ЕСТЬ — обновляем last_login
        console.log(`👤 Пользователь уже существует: ${id}`);
        
        const { error: updateError } = await supabase
            .from('portal_users')
            .update({
                username: username || existingUser.username,
                first_name: first_name || existingUser.first_name,
                last_login: new Date().toISOString()
            })
            .eq('telegram_id', id);

        if (updateError) {
            console.error('⚠️ Ошибка обновления:', updateError);
            // Не критично, продолжаем
        }

        return res.status(200).json({ 
            ok: true,
            created: false,
            message: 'Вход выполнен'
        });

    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        return res.status(500).json({ 
            ok: false, 
            error: 'Внутренняя ошибка сервера: ' + error.message
        });
    }
}
