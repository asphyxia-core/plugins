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
            this.argsHandler(console.error, ...args)
        }
    }


    public warn(...args: any[]) {
        this.argsHandler(console.warn, ...args)
    }

    public debugWarn(...args: any[]) {
        if (isAsphyxiaDebugMode()) {
            this.argsHandler(console.warn, ...args)
        }
    }


    public info(...args: any[]) {
        this.argsHandler(console.info, ...args)
    }

    public debugInfo(...args: any[]) {
        if (isAsphyxiaDebugMode()) {
            this.argsHandler(console.info, ...args)
        }
    }


    public log(...args: any[]) {
        this.argsHandler(console.log, ...args)
    }

    public debugLog(...args: any[]) {
        if (isAsphyxiaDebugMode()) {
            this.argsHandler(console.log, ...args)
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