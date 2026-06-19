import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
    // CORS
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не поддерживается' });
    }

    try {
        const { id, username, first_name } = req.body;

        if (!id) {
            return res.status(400).json({ 
                ok: false, 
                error: 'Нет Telegram ID' 
            });
        }

        // Проверяем существующего пользователя
        const { data: existingUser, error: checkError } = await supabase
            .from('portal_users')
            .select('telegram_id')
            .eq('telegram_id', id)
            .single();

        // Игнорируем ошибку "не найдено"
        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Ошибка проверки:', checkError);
            return res.status(500).json({ 
                ok: false, 
                error: 'Ошибка базы данных: ' + checkError.message 
            });
        }

        if (!existingUser) {
            console.log(`Создаём пользователя: ${id}`);
            
            // Создаём с заглушкой для password_hash
            const { error: insertError } = await supabase
                .from('portal_users')
                .insert({
                    telegram_id: id,
                    username: username || `user_${id}`,
                    first_name: first_name || 'Пользователь',
                    has_plus: false,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString(),
                    password_hash: 'telegram_auth' // 👈 Заглушка вместо NULL
                });

            if (insertError) {
                console.error('Ошибка создания:', insertError);
                return res.status(500).json({ 
                    ok: false, 
                    error: 'Ошибка создания: ' + insertError.message 
                });
            }

            console.log(`✅ Пользователь создан: ${username || id}`);
            return res.status(200).json({ 
                ok: true,
                created: true,
                message: 'Аккаунт создан'
            });
        }

        // Обновляем существующего
        const { error: updateError } = await supabase
            .from('portal_users')
            .update({
                username: username || existingUser.username,
                first_name: first_name || existingUser.first_name,
                last_login: new Date().toISOString()
            })
            .eq('telegram_id', id);

        if (updateError) {
            console.error('Ошибка обновления:', updateError);
        }

        return res.status(200).json({ 
            ok: true,
            created: false,
            message: 'Вход выполнен'
        });

    } catch (error) {
        console.error('Критическая ошибка:', error);
        return res.status(500).json({ 
            ok: false, 
            error: 'Внутренняя ошибка: ' + error.message 
        });
    }
}
