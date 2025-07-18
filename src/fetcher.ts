import { Page, ConsoleMessage, ElementHandle } from "puppeteer-core";

export default class Fetcher {
    private static chatHtmlIdRegex = new RegExp(/chat-messages-\d+-(\d+)/);
    private static messagesLoadedRegex = new RegExp(/Fetched 50 messages/);

    private readonly messages = new Map<string, string>;

    constructor(private readonly page: Page) { }

    private async fetchMessages(list: ElementHandle): Promise<void> {
        const items = (await list.$$("li"))!;

        for (const item of items) {
            const id = await item.evaluate(el => el.id);

            const arr = id.match(Fetcher.chatHtmlIdRegex);

            if (arr === null || arr.length < 1) {
                throw new Error("Error parsing message ID");
            }

            this.messages.set(arr[1], "text");
        }

        console.log("Fetching completed.");
    }

    private async waitForMessageLoad(): Promise<void> {
        return new Promise((resolve, _) => {
            const handler = (msg: ConsoleMessage) => {
                const text = msg.text();
                if (text.match(Fetcher.messagesLoadedRegex)?.length === 1) {
                    this.page.off("console", handler);
                    resolve();
                }
            }

            this.page.on("console", handler);
        });
    }

    private async loadMessages(scroller: ElementHandle) {
        await scroller.evaluate((el) => {
            el.scrollTop = 0;
        });

        console.log("Waiting for new messages");

        await this.waitForMessageLoad();

        console.log("New messages loaded completed.");
    }

    async init(): Promise<void> {
        await this.page.goto("https://discord.com/channels/@me");
    }

    async start(): Promise<void> {
        const body = (await this.page.$(".scroller__36d07"))!;
        const list = (await body.$("ol"))!;

        for (let i = 0; i < 5; i++) {
            await this.fetchMessages(list);
            await this.loadMessages(body);
        }
    }
}
