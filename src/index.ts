import puppeteer from "puppeteer-core";

import readline from "node:readline/promises";

const listSelector = "#app-mount > div.appAsidePanelWrapper_a3002d > div.notAppAsidePanel_a3002d > div.app_a3002d > div > div.layers__960e4.layers__160d8 > div > div > div > div.content_c48ade > div.page_c48ade > div > div > div.content_f75fb0 > main > div.messagesWrapper__36d07.group-spacing-16 > div > div > ol";

async function main() {
    const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222" });

    const page = await browser.newPage();

    await page.goto("https://discord.com/channels/@me");

    const rl = readline.createInterface(process.stdin, process.stdout);

    await rl.question("Navigate to your DM, then press enter...");

    const list = (await page.$(listSelector))!;

    const items = (await list.$$("li"))!;

    for (const item of items) {
        console.log("Found message!");
    }

    await browser.disconnect();
    process.stdin.pause();
}

(async () => main())()
