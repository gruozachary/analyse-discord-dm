import puppeteer from "puppeteer-core";
import readline from "node:readline/promises";

import Fetcher from "./fetcher"

async function main() {
    const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222" });

    const page = await browser.newPage();

    const fetcher = new Fetcher(page);
    await fetcher.init();

    const rl = readline.createInterface(process.stdin, process.stdout);
    await rl.question("Navigate to your DM, then press enter...");
    rl.close();

    await fetcher.start();

    const messages = fetcher.getMessages();
    console.log(messages);

    await browser.disconnect();
}

(async () => main())()
