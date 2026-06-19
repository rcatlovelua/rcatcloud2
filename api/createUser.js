import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

        // 1. Проверяем, существует ли пользователь
        const { data: existingUser, error: checkError } = await supabase
            .from('portal_users')
            .select('telegram_id')
            .eq('telegram_id', id)
            .single();

        // 2. Если пользователя НЕТ — создаём новый аккаунт
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
                console.error('❌ Ошибка создания аккаунта:', insertError);
                return res.status(500).json({ 
                    ok: false, 
                    error: 'Ошибка создания аккаунта' 
                });
            }

            console.log(`✅ Аккаунт создан для ${username || id}`);
            return res.status(200).json({ 
                ok: true,
                created: true,
                message: 'Аккаунт успешно создан'
            });
        }

        // 3. Если пользователь УЖЕ есть — просто обновляем last_login
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
            console.error('⚠️ Ошибка обновления last_login:', updateError);
            // Не критично, просто логируем
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
            error: 'Внутренняя ошибка сервера' 
        });
    }
}
