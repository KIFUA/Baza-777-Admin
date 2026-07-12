import cron from 'node-cron';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface BirthdaySettings {
    mondayEmails: string;
    wednesdayEmails: string;
    mondayTelegramIds: string;
    wednesdayTelegramIds: string;
    botToken: string;
    appPassword: string;
}

export function initBirthdayCron(getBirthdaysFn: () => any, getSettingsFn: () => BirthdaySettings) {
    console.log("Initializing Birthday Cron Jobs...");

    const sendTelegram = async (chatIds: string, text: string, botToken: string, pdfPath?: string) => {
        if (!botToken) return;
        const ids = chatIds.split(',').map(id => id.trim()).filter(Boolean);
        for (const chatId of ids) {
            try {
                if (pdfPath) {
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    const fileBuffer = fs.readFileSync(pdfPath);
                    const blob = new Blob([fileBuffer]);
                    formData.append('document', blob, 'Imenynnyky.pdf');
                    
                    await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
                    });
                }
            } catch (err) {
                console.error(`Telegram send error to ${chatId}:`, err);
            }
        }
    };

    const sendEmails = async (emails: string, subject: string, text: string, appPassword: string, pdfPath?: string) => {
        if (!appPassword || !emails) return;
        const mailList = emails.split(',').map(e => e.trim()).filter(Boolean);
        if (mailList.length === 0) return;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'kostel.if.ua@gmail.com', // fallback hardcoded for now or use what's provided? Let's use env or standard.
                pass: appPassword
            }
        });

        const mailOptions: any = {
            from: '"База 777" <kostel.if.ua@gmail.com>',
            to: mailList,
            subject: subject,
            text: text
        };

        if (pdfPath && fs.existsSync(pdfPath)) {
            const pdfBuffer = fs.readFileSync(pdfPath);
            mailOptions.attachments = [{
                filename: 'Imenynnyky.pdf',
                content: pdfBuffer
            }];
        }

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Emails sent to ${mailList.join(', ')}`);
        } catch (err) {
            console.error('Email send error:', err);
        }
    };

    // Monday 11:00
    cron.schedule('0 11 * * 1', async () => {
        console.log("Running Monday Birthday Cron...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) return;

        const UKR_DAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
        let msg = `🎂 *ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ* 🎂\n/ ${birthdays.weekRangeText} /\n\n`;
        
        birthdays.list.forEach((item: any) => {
            const dayName = UKR_DAYS[item.dayOfWeekNum];
            const dateFormatted = item.celebrationDate.split("-").reverse().join(".");
            const jubileeText = item.isJubilee ? `ювілей` : ``;
            msg += `${item.cleanName} (${dayName}, ${dateFormatted}${jubileeText ? ' - ' + jubileeText : ''})\n`;
        });

        await sendTelegram(settings.mondayTelegramIds, msg, settings.botToken);
        await sendEmails(settings.mondayEmails, `Іменинники тижня (${birthdays.weekRangeText})`, msg, settings.appPassword);
    });

    // Wednesday 11:00
    cron.schedule('0 11 * * 3', async () => {
        console.log("Running Wednesday Birthday Cron...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) return;

        const tempDir = (process.platform !== "win32") ? "/tmp" : os.tmpdir();
        const pdfPath = path.join(tempDir, 'birthdays_temp.pdf');
        const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 40 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const getFontPath = (fontName: string) => {
            const possiblePaths = [
                path.join(process.cwd(), 'fonts', fontName),
                path.join(process.cwd(), 'dist', 'fonts', fontName),
                path.join('/var/task', 'fonts', fontName),
                path.join('/var/task', '..', 'fonts', fontName),
            ];
            if (typeof __dirname !== 'undefined') {
                possiblePaths.push(path.join(__dirname, 'fonts', fontName));
                possiblePaths.push(path.join(__dirname, '..', 'fonts', fontName));
                possiblePaths.push(path.join(__dirname, '..', '..', 'fonts', fontName));
            }
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) return p;
            }
            return "";
        };

        const regularFont = getFontPath('Roboto-Regular.ttf');
        const boldFont = getFontPath('Roboto-Bold.ttf');
        
        if (regularFont && boldFont && fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
            doc.font(boldFont).fontSize(14).text('ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ', { align: 'center' });
            doc.moveDown(0.5);
            doc.font(regularFont).fontSize(10).text(`/ ${birthdays.weekRangeText} /`, { align: 'center' });
            doc.moveDown(2);

            const dateText = `/ ${birthdays.weekRangeText} /`;
            const dateWidth = doc.widthOfString(dateText);
            const prefixWidth = doc.widthOfString("/ ");
            const dateStartX = (doc.page.width - dateWidth) / 2;
            const namesStartX = dateStartX + prefixWidth;

            doc.x = namesStartX;
            birthdays.list.forEach((item: any) => {
                doc.font(boldFont).fontSize(12);
                if (item.isJubilee) {
                    doc.fillColor('red');
                } else {
                    doc.fillColor('black');
                }
                doc.text(item.shortName || item.cleanName, { align: 'left' });
            });
        } else {
            const translit = (text: string): string => {
                const map: Record<string, string> = {
                    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'H', 'Ґ': 'G', 'Д': 'D', 'Е': 'E', 'Є': 'Ye', 'Ж': 'Zh', 'З': 'Z', 'И': 'Y', 'І': 'I', 'Ї': 'Yi', 'Й': 'Y',
                    'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch', 'Ю': 'Yu', 'Я': 'Ya',
                    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y',
                    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ю': 'yu', 'я': 'ya',
                    'ь': '', '’': '', '\'': ''
                };
                return text.split('').map(char => map[char] !== undefined ? map[char] : char).join('');
            };

            doc.fontSize(14).text(translit('ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ'), { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).text(`/ ${birthdays.weekRangeText} /`, { align: 'center' });
            doc.moveDown(2);

            const dateText = `/ ${birthdays.weekRangeText} /`;
            const dateWidth = doc.widthOfString(dateText);
            const prefixWidth = doc.widthOfString("/ ");
            const dateStartX = (doc.page.width - dateWidth) / 2;
            const namesStartX = dateStartX + prefixWidth;

            doc.x = namesStartX;
            birthdays.list.forEach((item: any) => {
                doc.fontSize(12);
                const displayName = translit(item.shortName || item.cleanName);
                doc.text(displayName, { align: 'left' });
            });
        }
        
        doc.end();

        writeStream.on('finish', async () => {
            let msg = `📄 Прикріплено файл ПДФ зі списком іменинників поточного тижня (${birthdays.weekRangeText}).`;
            await sendTelegram(settings.wednesdayTelegramIds, msg, settings.botToken, pdfPath);
            await sendEmails(settings.wednesdayEmails, `Іменинники тижня PDF (${birthdays.weekRangeText})`, msg, settings.appPassword, pdfPath);
            fs.unlinkSync(pdfPath); // Cleanup
        });
    });
}
