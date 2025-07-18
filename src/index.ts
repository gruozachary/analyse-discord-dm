import puppeteer, { Page, ConsoleMessage } from "puppeteer-core";

import readline from "node:readline/promises";

const listSelector = "#app-mount > div.appAsidePanelWrapper_a3002d > div.notAppAsidePanel_a3002d > div.app_a3002d > div > div.layers__960e4.layers__160d8 > div > div > div > div.content_c48ade > div.page_c48ade > div > div > div.content_f75fb0 > main > div.messagesWrapper__36d07.group-spacing-16 > div > div > ol";

const chatHtmlIdRegex = new RegExp(/chat-messages-\d+-(\d+)/);
const messagesLoadedRegex = new RegExp(/Fetched 50 messages/);

async function waitForMessageLoad(page: Page): Promise<void> {
    return new Promise((resolve, _) => {
        const handler = (msg: ConsoleMessage) => {
            const text = msg.text();
            if (text.match(messagesLoadedRegex)?.length === 1) {
                page.off("console", handler);
                resolve();
            }
        }

        page.on("console", handler);
    });
}

async function main() {
    const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222" });

    const page = await browser.newPage();

    await page.goto("https://discord.com/channels/@me");

    const rl = readline.createInterface(process.stdin, process.stdout);

    await rl.question("Navigate to your DM, then press enter...");

    const body = (await page.$(".scroller__36d07"))!;

    const list = (await page.$(listSelector))!;

    const messages = new Map<string, string>();
    for (let i = 0; i < 5; i++) {
        const items = (await list.$$("li"))!;

        for (const item of items) {
            const id = await item.evaluate(el => el.id);

            const arr = id.match(chatHtmlIdRegex);

            if (arr === null || arr.length < 1) {
                throw new Error("Error parsing message ID");
            }

            messages.set(arr[1], "text");
        }

        console.log(`Iteration ${i}: Fetching completed.`);

        await body.evaluate((el) => {
            el.scrollTop = 0;
        });

        console.log(`Iteration ${i}: Scrolling completed - waiting for new messages`);

        await waitForMessageLoad(page);

        console.log(`Iteration ${i}: New messages loaded completed.`);
    }

    await browser.disconnect();
    process.stdin.pause();
}

(async () => main())()
