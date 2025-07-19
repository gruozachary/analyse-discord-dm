import { Page, ConsoleMessage, ElementHandle } from "puppeteer-core";

export interface Message {
    user: string | null;
    id: number,
    text: string,
}

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

    private readonly messages = new Map<number, Message>;

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

            if (await item.$("div[class*='system']") !== null) {
                continue;
            }

            const arr = id.match(Fetcher.chatHtmlIdRegex);

            if (arr === null || arr.length < 2) {
                throw new Error("Error parsing message ID");
            }

            const username = await item
                .$eval("[class^='username']", (el) => el.innerHTML)
                .catch(() => null);

            const messageContent = await item.$("[id^='message-content-']:not([class^='repliedTextContent'])");

            const messageText = await messageContent?.$$eval("span", els => els.map(el => el.textContent!.trim()).join(" "));

            const messageId = Number.parseInt(arr[1]);
            this.messages.set(messageId, {
                user: username,
                id: messageId,
                text: messageText || "UNKNOWN"
            });
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

    private async waitTillFinished(body: ElementHandle): Promise<void> {
        await body.waitForSelector("[class*='heading-xxl']");
    }

    private async loadMessages(scroller: ElementHandle): Promise<boolean> {
        await scroller.evaluate((el) => {
            el.scrollTop = 0;
        });

        console.log("Waiting for new messages");


        const res = await Promise.race([
            Promise.race([
                this.waitTillFinished(scroller),
                new Promise((_, reject) => setTimeout(() => reject(), 5000))
            ]).then(() => true),
            Promise.race([
                this.waitForMessageLoad(),
                new Promise((_, reject) => setTimeout(() => reject(), 5000))
            ]).then(() => false),
        ]);


        console.log("New messages loaded completed.");

        return res;
    }

    private fixUsernames(messages: Array<Message>) {
        for (let i = 1; i < messages.length; i++) {
            if (messages[i].user === null) {
                messages[i].user = messages[i - 1].user;
            }
        }
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

        let exit = false;
        do {
            if (await this.loadMessages(body)) {
                exit = true;
            }
            await this.fetchMessages(list);
        } while (!exit);

        this.state = FetcherState.Finished;
    }

    getMessages(): Array<Message> {
        this.assertState(FetcherState.Finished);

        const messageArr = [...this.messages.values()].sort((m1, m2) => m1.id - m2.id);

        this.fixUsernames(messageArr);

        return messageArr;
    }
}
