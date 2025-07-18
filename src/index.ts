import puppeteer from "puppeteer-core";
import readline from "node:readline/promises";
import envPaths from "env-paths";
import fs from "node:fs/promises";

import Fetcher from "./fetcher"

async function main() {
    const paths = envPaths("analyseddm");

    const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9222" });

    const page = await browser.newPage();

    const fetcher = new Fetcher(page);
    await fetcher.init();

    const rl = readline.createInterface(process.stdin, process.stdout);
    await rl.question("Navigate to your DM, then press enter...");
    rl.close();

    await fetcher.start();

    const outputFilePath = paths.cache + "/out.json";
    const messages = fetcher.getMessages();
    await fs.mkdir(paths.cache, { recursive: true });
    await fs.writeFile(
        outputFilePath,
        JSON.stringify(messages),
    );
    console.log(`Output written to: ${outputFilePath}`);

    await browser.disconnect();
}

(async () => main())()
