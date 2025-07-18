import { Page, ConsoleMessage, ElementHandle } from "puppeteer-core";

enum FetcherState {
    Uninitialised,
    Initialised,
    Processing,
    Finished,
    Invalid
}

export default class Fetcher {
    private static chatHtmlIdRegex = new RegExp(/chat-messages-\d+-(\d+)/);
    private static messagesLoadedRegex = new RegExp(/Fetched 50 messages/);

    private state: FetcherState = FetcherState.Uninitialised;

    private readonly messages = new Map<string, string>;

    constructor(private readonly page: Page) { }

    private assertState(state: FetcherState) {
        if (this.state !== state) {
            this.state = FetcherState.Invalid;
            throw Error("Unexpected state!");
        }
    }

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
        this.assertState(FetcherState.Uninitialised);

        await this.page.goto("https://discord.com/channels/@me");
        this.state = FetcherState.Initialised;
    }

    async start(): Promise<void> {
        this.assertState(FetcherState.Initialised);
        this.state = FetcherState.Processing;

        const body = (await this.page.$(".scroller__36d07"))!;
        const list = (await body.$("ol"))!;

        for (let i = 0; i < 5; i++) {
            await this.fetchMessages(list);
            await this.loadMessages(body);
        }

        this.state = FetcherState.Finished;
    }

    getMessages(): Map<string, string> {
        this.assertState(FetcherState.Finished);

        return this.messages;
    }
}
