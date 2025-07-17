import puppeteer from "puppeteer-core";

import readline from "node:readline";


async function main() {
    const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222" });

    const page = await browser.newPage();

    await page.goto("https://discord.com/channels/@me");

    const rl = readline.createInterface(process.stdin, process.stdout);

    rl.question("Navigate to your DM, then press enter...", () => rl.close());

    await browser.disconnect();
}

(async () => main())()
