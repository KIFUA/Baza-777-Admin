import cron from 'node-cron';
import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import axios from 'axios';
import FormData from 'form-data';
import { getRobotoRegularFont, getRobotoBoldFont } from './fontsBase64.ts';

async function getPuppeteerExecutablePath(): Promise<string | undefined> {
  const customPaths = [
    '/www-data-home/.cache/puppeteer/chrome/linux-151.0.7922.71/chrome-linux64/chrome',
    '/www-data-home/.cache/puppeteer/chrome/linux-133.0.6943.53/chrome-linux64/chrome',
    '/www-data-home/.cache/puppeteer/chrome/linux-128.0.6613.119/chrome-linux64/chrome',
    path.join(process.cwd(), '.cache', 'puppeteer', 'chrome', 'linux-151.0.7922.71', 'chrome-linux64', 'chrome'),
    path.join(process.cwd(), '.cache', 'puppeteer', 'chrome', 'linux-133.0.6943.53', 'chrome-linux64', 'chrome'),
    path.join(process.cwd(), '.cache', 'puppeteer', 'chrome', 'linux-128.0.6613.119', 'chrome-linux64', 'chrome'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/root/.cache/puppeteer/chrome/linux-151.0.7922.71/chrome-linux64/chrome',
    '/root/.cache/puppeteer/chrome/linux-133.0.6943.53/chrome-linux64/chrome',
    '/root/.cache/puppeteer/chrome/linux-128.0.6613.119/chrome-linux64/chrome',
  ];
  for (const p of customPaths) {
    if (fs.existsSync(p)) return p;
  }

  const checkDirs = [
    path.join(process.cwd(), '.cache', 'puppeteer', 'chrome'),
    '/www-data-home/.cache/puppeteer/chrome',
    '/root/.cache/puppeteer/chrome',
    path.join(os.homedir(), '.cache', 'puppeteer', 'chrome')
  ];

  for (const dir of checkDirs) {
    try {
      if (fs.existsSync(dir)) {
        const versions = fs.readdirSync(dir);
        for (const ver of versions) {
          const candidate = path.join(dir, ver, 'chrome-linux64', 'chrome');
          if (fs.existsSync(candidate)) return candidate;
        }
      }
    } catch (e) {}
  }

  try {
    const cacheDir = '/root/.cache/puppeteer/chrome';
    if (fs.existsSync(cacheDir)) {
      const versions = fs.readdirSync(cacheDir);
      for (const ver of versions) {
        const candidate = path.join(cacheDir, ver, 'chrome-linux64', 'chrome');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch (e) {}

  try {
    const p = await (puppeteer as any).executablePath();
    if (p && fs.existsSync(p)) return p;
  } catch (e) {}

  try {
    console.log('[Puppeteer] Chrome not found in cache, attempting installation...');
    execSync('PUPPETEER_CACHE_DIR=' + path.join(process.cwd(), '.cache', 'puppeteer') + ' npx puppeteer browsers install chrome', { stdio: 'inherit' });
    const wsCacheDir = path.join(process.cwd(), '.cache', 'puppeteer', 'chrome');
    if (fs.existsSync(wsCacheDir)) {
      const versions = fs.readdirSync(wsCacheDir);
      for (const ver of versions) {
        const candidate = path.join(wsCacheDir, ver, 'chrome-linux64', 'chrome');
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch (e) {
    console.error('[Puppeteer] Failed to auto-install chrome:', e);
  }

  return undefined;
}

async function launchBrowser() {
  try {
    const chromiumObj = (chromium as any).default || chromium;
    const execFn = chromiumObj.executablePath || (chromium as any).executablePath;
    if (typeof execFn === 'function') {
      const sparticuzPath = await execFn();
      if (sparticuzPath && fs.existsSync(sparticuzPath)) {
        console.log('[Puppeteer] Launching browser with @sparticuz/chromium at:', sparticuzPath);
        return await puppeteer.launch({
          args: chromiumObj.args || ['--no-sandbox', '--disable-setuid-sandbox'],
          executablePath: sparticuzPath,
          headless: chromiumObj.headless ?? true,
        });
      }
    }
  } catch (e: any) {
    console.log('[Puppeteer] @sparticuz/chromium fallback:', e?.message || e);
  }

  const execPath = await getPuppeteerExecutablePath();
  const options: any = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=medium']
  };
  if (execPath) {
    options.executablePath = execPath;
  }
  return await puppeteer.launch(options);
}

export interface TelegramBotConnector {
    id: string;
    name: string;
    token: string;
}

export interface EmailConnector {
    user: string;
    appPassword: string;
}

export interface BirthdayScheduleSettings {
    day: number;
    hour: number;
    minute: number;
    connectorType: 'telegram' | 'email';
    connectorId: string;
    recipientId: string;
}

export interface BirthdaySettings {
    connectors: {
        telegramBots: TelegramBotConnector[];
        email: EmailConnector;
    };
    birthdays: {
        text: BirthdayScheduleSettings;
        pdf: BirthdayScheduleSettings;
    };
    // Keep these for internal use if needed during transition, but interfaces should reflect new reality
    botToken?: string;
    appPassword?: string;
}

let isInitialized = false;

const STATE_FILE = path.join(os.tmpdir(), 'last_sent_distributions.json');

const getKyivDateTime = () => {
    const d = new Date();
    // Use a formatter that gives us exactly what we need
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
    
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10);
    const day = parseInt(getPart('day'), 10);
    const hour = parseInt(getPart('hour'), 10);
    const minute = parseInt(getPart('minute'), 10);
    
    // For day of week, it's safer to use a specific formatter part if possible, 
    // or just calculate it correctly from the parts.
    // In 'en-US' with weekday: 'short', we get "Sun", "Mon", etc.
    const dayOfWeekStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', weekday: 'short' }).format(d);
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayOfWeek = dayMap[dayOfWeekStr] ?? 0;
    
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    return {
        dateStr,
        dayOfWeek,
        hour,
        minute
    };
};

export function initBirthdayCron(getBirthdaysFn: () => any, getSettingsFn: () => BirthdaySettings) {
    if (process.env.VERCEL) {
        console.log("[BirthdayCron] Vercel environment detected. Skipping background cron scheduler.");
        return;
    }
    if (isInitialized) {
        console.log("[BirthdayCron] Already initialized, skipping.");
        return;
    }
    isInitialized = true;
    console.log("Initializing Birthday Cron Jobs (Europe/Kyiv)...");

    const sendTelegram = async (chatIds: string, text: string, botToken: string, filePath?: string, displayFilename?: string) => {
        if (!botToken) {
            console.warn("[BirthdayCron] No bot token provided for Telegram.");
            return;
        }
        const ids = chatIds.split(',').map(id => id.trim()).filter(Boolean);
        if (ids.length === 0) {
            console.warn("[BirthdayCron] No Telegram chat IDs provided.");
            return;
        }

        for (const chatId of ids) {
            try {
                if (filePath && fs.existsSync(filePath)) {
                    console.log(`[BirthdayCron] Sending file to Telegram chat ${chatId}: ${filePath}`);
                    const fileBuffer = fs.readFileSync(filePath);
                    const filename = displayFilename || path.basename(filePath);
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    if (text) {
                        formData.append('caption', text);
                    }
                    formData.append('document', fileBuffer, { filename });
                    
                    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, {
                        headers: formData.getHeaders()
                    });
                    if (response.data.ok) {
                        console.log(`[BirthdayCron] File ${filename} sent successfully to Telegram chat ${chatId}`);
                    } else {
                        console.error(`[BirthdayCron] Telegram sendDocument failed for ${chatId}:`, response.data);
                    }
                } else {
                    console.log(`[BirthdayCron] Sending text message to ${chatId}`);
                    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        chat_id: chatId,
                        text: text,
                        parse_mode: 'Markdown'
                    });
                }
            } catch (err: any) {
                console.error(`[BirthdayCron] Telegram send error to ${chatId}:`, err.response?.data || err.message);
            }
        }
    };

    const sendEmails = async (emails: string, subject: string, text: string, emailConfig: EmailConnector, attachments?: { filename: string, path: string }[]) => {
        if (!emailConfig.appPassword || !emails) return;
        const mailList = emails.split(',').map(e => e.trim()).filter(Boolean);
        if (mailList.length === 0) return;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailConfig.user || 'kostel.if.ua@gmail.com',
                pass: emailConfig.appPassword
            }
        });

        const mailOptions: any = {
            from: `"База 777" <${emailConfig.user || 'kostel.if.ua@gmail.com'}>`,
            to: mailList,
            subject: subject,
            text: text
        };

        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Emails sent to ${mailList.join(', ')}`);
        } catch (err) {
            console.error('Email send error:', err);
        }
    };

    const sendToConnector = async (schedule: BirthdayScheduleSettings, connectors: BirthdaySettings['connectors'], text: string, subject: string, filePath?: string, attachments?: any[]) => {
        if (schedule.connectorType === 'telegram') {
            const bot = connectors.telegramBots.find(b => b.id === schedule.connectorId) || connectors.telegramBots[0];
            if (bot) {
                const displayFilename = attachments?.find(a => a.path === filePath)?.filename;
                await sendTelegram(schedule.recipientId, text, bot.token, filePath, displayFilename);
            }
        } else if (schedule.connectorType === 'email') {
            await sendEmails(schedule.recipientId, subject, text, connectors.email, attachments);
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

        const subject = `Іменинники тижня (${birthdays.weekRangeText})`;
        await sendToConnector(settings.birthdays.text, settings.connectors, msg, subject);
        console.log("Distribution 1 completed.");
    };

    const runWednesdayDistribution = async () => {
        console.log("[BirthdayCron] Running Distribution 2 (PDF & HTML)...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (!birthdays || !birthdays.list || birthdays.list.length === 0) {
            console.log("[BirthdayCron] No birthdays this week, skipping distribution 2.");
            return;
        }

        const nowTs = Date.now();
        const pdfPath = path.join(os.tmpdir(), `birthdays_${nowTs}.pdf`);
        const htmlPath = path.join(os.tmpdir(), `birthdays_${nowTs}.html`);
        
        console.log(`[BirthdayCron] Generating files: ${pdfPath}, ${htmlPath}`);

        // --- HTML Generation ---
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A5 portrait; margin: 15mm; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    padding: 30px; 
                    color: #000; 
                    font-weight: bold;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                h1 { text-align: center; color: #000; font-size: 22px; margin-bottom: 5px; font-weight: 800; text-transform: uppercase; }
                .subtitle { text-align: center; font-size: 14px; color: #333; margin-bottom: 25px; font-weight: normal; }
                .birthday-list { display: inline-block; text-align: left; margin: 0 auto; }
                .birthday-item { font-size: 17px; font-weight: bold; text-align: left; line-height: 1.5; color: #000; }
                .jubilee { color: #dc2626; }
            </style>
        </head>
        <body>
            <h1>ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ</h1>
            <div class="subtitle">/ ${birthdays.weekRangeText} /</div>
            <div class="birthday-list">
        `;

        birthdays.list.forEach((item: any) => {
            const nameParts = (item.cleanName || item.fullName || "").trim().split(/\s+/);
            const shortName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]}` : nameParts[0];
            const itemClass = item.isJubilee ? 'birthday-item jubilee' : 'birthday-item';
            htmlContent += `
                <div class="${itemClass}">${shortName}</div>
            `;
        });

        htmlContent += `
            </div>
        </body>
        </html>
        `;
        fs.writeFileSync(htmlPath, htmlContent);

        // --- PDF Generation via Puppeteer ---
        try {
            const browser = await launchBrowser();
            try {
                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
                const pdfBuffer = await page.pdf({ format: 'A5', printBackground: true });
                fs.writeFileSync(pdfPath, pdfBuffer);
                console.log(`[BirthdayCron] Puppeteer generated PDF at ${pdfPath}`);
            } finally {
                await browser.close();
            }
        } catch (pdfErr) {
            console.error("[BirthdayCron] Error during PDF drawing:", pdfErr);
        }

        try {
            const attachments = [];
            let pdfSuccessful = false;
            if (fs.existsSync(pdfPath)) {
                const stats = fs.statSync(pdfPath);
                if (stats.size > 100) {
                    attachments.push({ filename: `Список іменинників ${birthdays.weekRangeText}.pdf`, path: pdfPath });
                    pdfSuccessful = true;
                } else {
                    console.warn(`[BirthdayCron] Generated PDF is too small (${stats.size} bytes)!`);
                }
            }
            if (fs.existsSync(htmlPath)) {
                attachments.push({ filename: `Список іменинників ${birthdays.weekRangeText}.html`, path: htmlPath });
            }

            let msg = "";
            if (!pdfSuccessful) {
                msg = `⚠️ УВАГА: Виникла помилка при генерації PDF для ${birthdays.weekRangeText}. Будь ласка, використайте HTML файл або текстовий список.`;
            }
            
            console.log("[BirthdayCron] Sending via Connector (Distribution 2)...");
            const telegramAttachment = attachments.find(a => a.filename.endsWith('.pdf')) 
                                   || attachments.find(a => a.filename.endsWith('.html'));
            const telegramFilePath = telegramAttachment?.path;
            
            const subject = `Іменинники тижня (${birthdays.weekRangeText})`;
            await sendToConnector(settings.birthdays.pdf, settings.connectors, msg, subject, telegramFilePath, attachments);
            
            // Cleanup
            if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
            if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
            
            console.log("[BirthdayCron] Distribution 2 completed successfully.");
        } catch (err) {
            console.error("[BirthdayCron] Error in distribution 2 handler:", err);
        }
    };

    // Check every minute for scheduled distributions
    cron.schedule('* * * * *', async () => {
        try {
            const now = getKyivDateTime();
            const settings = getSettingsFn();
            
            // Log every hour to show we're alive
            if (now.minute === 0) {
                console.log(`[BirthdayCron] Heartbeat (Kyiv time): ${now.dateStr} ${now.hour}:${now.minute}, Day: ${now.dayOfWeek}`);
            }

            const mondayDay = settings.birthdays.text.day;
            const mondayHour = settings.birthdays.text.hour;
            const mondayMinute = settings.birthdays.text.minute;

            const wedDay = settings.birthdays.pdf.day;
            const wedHour = settings.birthdays.pdf.hour;
            const wedMinute = settings.birthdays.pdf.minute;

            let state: any = {};
            if (fs.existsSync(STATE_FILE)) {
                try {
                    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
                } catch (e) {
                    console.error("[BirthdayCron] Error reading state file:", e);
                }
            }

            // Distribution 1
            if (now.dayOfWeek === mondayDay && now.hour === mondayHour && now.minute === mondayMinute) {
                if (state.lastMondaySent !== now.dateStr) {
                    console.log(`[BirthdayCron] Triggering Monday Distribution 1 (Day=${now.dayOfWeek}, Time=${now.hour}:${now.minute})`);
                    await runMondayDistribution();
                    state.lastMondaySent = now.dateStr;
                    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
                }
            }

            // Distribution 2
            if (now.dayOfWeek === wedDay && now.hour === wedHour && now.minute === wedMinute) {
                if (state.lastWednesdaySent !== now.dateStr) {
                    console.log(`[BirthdayCron] Triggering Wednesday Distribution 2 (Day=${now.dayOfWeek}, Time=${now.hour}:${now.minute})`);
                    await runWednesdayDistribution();
                    state.lastWednesdaySent = now.dateStr;
                    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
                }
            }
        } catch (globalErr) {
            console.error("[BirthdayCron] Global error in cron tick:", globalErr);
        }
    }, {
        timezone: "Europe/Kyiv"
    });
}
