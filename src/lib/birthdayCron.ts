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
    mondayMailingDay?: number | string;
    mondayMailingHour?: number | string;
    wednesdayMailingDay?: number | string;
    wednesdayMailingHour?: number | string;
}

let isInitialized = false;

const STATE_FILE = path.join(os.tmpdir(), 'last_sent_distributions.json');

const getKyivDateTime = () => {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
    
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10);
    const day = parseInt(getPart('day'), 10);
    const hour = parseInt(getPart('hour'), 10);
    const minute = parseInt(getPart('minute'), 10);
    
    // Create date object in Kyiv time
    const kyivDate = new Date(year, month - 1, day, hour, minute);
    
    // Calculate day of week manually because getDay() might use local time if not careful
    // But since we built kyivDate from parts, it should be relatively consistent
    const dayOfWeek = kyivDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    return {
        dateStr,
        dayOfWeek,
        hour,
        minute
    };
};

export function initBirthdayCron(getBirthdaysFn: () => any, getSettingsFn: () => BirthdaySettings) {
    if (isInitialized) {
        return;
    }
    isInitialized = true;
    console.log("Initializing Birthday Cron Jobs (Europe/Kyiv)...");

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
                user: 'kostel.if.ua@gmail.com',
                pass: appPassword
            }
        });

        const mailOptions: any = {
            from: '"База 777" <kostel.if.ua@gmail.com>',
            to: mailList,
            subject: subject,
            text: text
        };

        if (pdfPath) {
            mailOptions.attachments = [{
                filename: 'Imenynnyky.pdf',
                path: pdfPath
            }];
        }

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Emails sent to ${mailList.join(', ')}`);
        } catch (err) {
            console.error('Email send error:', err);
        }
    };

    const runMondayDistribution = async () => {
        console.log("Running Distribution 1 (Text)...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) {
            console.log("No birthdays this week, skipping distribution 1.");
            return;
        }

        const UKR_DAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
        let msg = `🎂 *ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ* 🎂\n/ ${birthdays.weekRangeText} /\n\n`;
        
        birthdays.list.forEach((item: any) => {
            const dayName = UKR_DAYS[item.dayOfWeekNum];
            const dateFormatted = item.celebrationDate.split("-").reverse().join(".");
            const jubileeText = item.isJubilee ? `ювілей` : ``;
            msg += `${item.cleanName || item.fullName} (${dayName}, ${dateFormatted}${jubileeText ? ' - ' + jubileeText : ''})\n`;
        });

        await sendTelegram(settings.mondayTelegramIds, msg, settings.botToken);
        await sendEmails(settings.mondayEmails, `Іменинники тижня (${birthdays.weekRangeText})`, msg, settings.appPassword);
        console.log("Distribution 1 completed.");
    };

    const runWednesdayDistribution = async () => {
        console.log("Running Distribution 2 (PDF)...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) {
            console.log("No birthdays this week, skipping distribution 2.");
            return;
        }

        const pdfPath = path.join(os.tmpdir(), 'birthdays_temp.pdf');
        const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 40 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const regularFont = path.resolve(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
        const boldFont = path.resolve(process.cwd(), 'fonts', 'Roboto-Bold.ttf');
        
        if (fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
            const headerText = 'ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ';
            doc.font(boldFont).fontSize(14);
            const headerWidth = doc.widthOfString(headerText);
            const prefixWidth = doc.widthOfString('ІМЕ');
            const headerLeftX = doc.page.margins.left + (doc.page.width - doc.page.margins.left - doc.page.margins.right - headerWidth) / 2;
            const listLeftX = headerLeftX + prefixWidth;

            doc.text(headerText, { align: 'center' });
            doc.moveDown(0.5);
            
            const subheaderText = `/ ${birthdays.weekRangeText} /`;
            doc.font(regularFont).fontSize(10);
            doc.text(subheaderText, { align: 'center' });
            doc.moveDown(2);

            birthdays.list.forEach((item: any) => {
                doc.font(boldFont).fontSize(12);
                if (item.isJubilee) {
                    doc.fillColor('red');
                } else {
                    doc.fillColor('black');
                }
                const nameText = item.cleanName || item.fullName || item.shortName;
                doc.text(nameText, listLeftX, doc.y);
                doc.moveDown(0.5);
            });
        }
        
        doc.end();

        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', async () => {
                try {
                    let msg = `📄 Прикріплено файл ПДФ зі списком іменинників поточного тижня (${birthdays.weekRangeText}).`;
                    await sendTelegram(settings.wednesdayTelegramIds, msg, settings.botToken, pdfPath);
                    await sendEmails(settings.wednesdayEmails, `Іменинники тижня PDF (${birthdays.weekRangeText})`, msg, settings.appPassword, pdfPath);
                    if (fs.existsSync(pdfPath)) {
                        fs.unlinkSync(pdfPath);
                    }
                    console.log("Distribution 2 completed.");
                    resolve();
                } catch (err) {
                    console.error("Error in distribution 2 writeStream finish handler:", err);
                    reject(err);
                }
            });
            writeStream.on('error', (err) => {
                console.error("WriteStream error:", err);
                reject(err);
            });
        });
    };

    // Check every hour for scheduled distributions
    cron.schedule('0 * * * *', async () => {
        const now = getKyivDateTime();
        const settings = getSettingsFn();
        
        const mondayDay = settings.mondayMailingDay !== undefined ? Number(settings.mondayMailingDay) : 1;
        const mondayHour = settings.mondayMailingHour !== undefined ? Number(settings.mondayMailingHour) : 11;
        const wedDay = settings.wednesdayMailingDay !== undefined ? Number(settings.wednesdayMailingDay) : 3;
        const wedHour = settings.wednesdayMailingHour !== undefined ? Number(settings.wednesdayMailingHour) : 11;

        console.log(`Cron check (Kyiv): Day=${now.dayOfWeek}, Hour=${now.hour}. Scheduled 1: Day=${mondayDay}, Hour=${mondayHour}. Scheduled 2: Day=${wedDay}, Hour=${wedHour}`);

        let state: any = {};
        if (fs.existsSync(STATE_FILE)) {
            try {
                state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            } catch (e) {}
        }

        // Distribution 1
        if (now.dayOfWeek === mondayDay && now.hour === mondayHour) {
            if (state.lastMondaySent !== now.dateStr) {
                await runMondayDistribution();
                state.lastMondaySent = now.dateStr;
                fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
            }
        }

        // Distribution 2
        if (now.dayOfWeek === wedDay && now.hour === wedHour) {
            if (state.lastWednesdaySent !== now.dateStr) {
                await runWednesdayDistribution();
                state.lastWednesdaySent = now.dateStr;
                fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
            }
        }
    }, {
        timezone: "Europe/Kyiv"
    });
}
