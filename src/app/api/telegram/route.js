import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = process.env.TELEGRAM_OWNER_ID;
// Жестко задаем ваш домен, чтобы избежать проблем с переменными окружения Vercel
const SITE_LINK = 'https://rzd-machinist-portal.vercel.app'; 

const sendTextMessage = async (chatId, text, options = {}) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        ...options,
    };
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
};

const sendPhotoMessage = async (chatId, photo, caption) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', photo.file, photo.name);
    if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
    }
    
    await fetch(url, {
        method: 'POST',
        body: formData,
    });
};

async function handleUserMessage(update) {
    const chatId = update.message.chat.id;
    if (String(chatId) === String(OWNER_ID)) return; 

    const linkText = '⠀'; 
    const invisibleLink = `<a href="${SITE_LINK}">${linkText}</a>`; 

    const message = `
<b>🚂 Демо-портал машиниста РЖД</b>
Привет! Это автоматическое сообщение от демо-портала о профессии машиниста.

<b>О проекте:</b>
Сайт создан для информирования о профессии: история и современность локомотивов, карьерные пути, учебные заведения. Выполнен в фирменных цветах РЖД (белый/красный) с современными 3D-эффектами.

<a href="${SITE_LINK}">Посетить сайт</a> ${invisibleLink}

<b>ВНИМАНИЕ:</b> Чтобы получить красивый предпросмотр сайта, Telegram должен самостоятельно сгенерировать его. Простое добавление ссылки в конце сообщения часто помогает.
`;
    
    await sendTextMessage(chatId, message);
}

export async function POST(req) {
    const contentType = req.headers.get('content-type') || '';

    // 1. ОБРАБОТКА ФОРМЫ (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
        try {
            const formData = await req.formData();
            
            const email = formData.get('email');
            const message = formData.get('message');
            const files = formData.getAll('files');
            
            if (!email || !message) {
                return NextResponse.json({ error: 'Отсутствует почта или сообщение' }, { status: 400 });
            }

            let mainMessage = `
<b>📧 Новое сообщение с Демо-портала!</b>
<b>От:</b> ${email}
<b>Сообщение:</b>
${message}
`;

            let fileNames = [];
            if (files && files.length > 0) {
                fileNames = files.map(f => f.name);
                mainMessage += `\n\n<b>Прикреплено файлов:</b> ${files.length} (${fileNames.join(', ')})`;
            }

            await sendTextMessage(OWNER_ID, mainMessage);

            if (files && files.length > 0) {
                const firstFile = files[0];
                await sendPhotoMessage(OWNER_ID, { file: firstFile, name: firstFile.name }, `Первое прикрепленное фото: ${firstFile.name}`);

                for (let i = 1; i < files.length; i++) {
                    const file = files[i];
                    await sendPhotoMessage(OWNER_ID, { file: file, name: file.name });
                }
            }

            return NextResponse.json({ success: true, fileNames }, { status: 200 });
        } catch (error) {
            console.error('Form processing error:', error);
            return NextResponse.json({ error: 'Внутренняя ошибка сервера при обработке формы' }, { status: 500 });
        }
    } 
    
    // 2. ОБРАБОТКА TELEGRAM WEBHOOK (application/json)
    // Вебхук Telegram всегда отправляет POST-запрос с JSON-телом. 
    // Поскольку он не может быть multipart/form-data, он должен быть Webhook.
    else {
        try {
            const update = await req.json();
            
            if (update.message) {
                await handleUserMessage(update);
            }

            return NextResponse.json({ success: true }, { status: 200 });
        } catch (error) {
            // Если запрос не смог быть распарсен как JSON, игнорируем, чтобы не ломать Webhook
            return NextResponse.json({ success: false, error: 'Could not parse JSON or webhook failed' }, { status: 200 });
        }
    }
}

export async function GET(req) {
    return NextResponse.json({ status: 'OK', message: 'Telegram webhook endpoint is running.' }, { status: 200 });
}
