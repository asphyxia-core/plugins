import { isAsphyxiaDebugMode } from ".";

export default class Logger {
    public category: string | null;
    
    public constructor(category?: string) {
        this.category = (category == null) ? null : `[${category}]`
    }

    public error(...args: any[]) {
        this.argsHandler(console.error, ...args)
    }
    public debugError(...args: any[]) {
        if (isAsphyxiaDebugMode()) {
            this.argsHandler(console.warn, ...args)
        }
    }
    private argsHandler(target: Function, ...args: any[]) {
        if (this.category == null) {
            target(...args)
        } else {
            target(this.category, ...args)
        }
    }
}