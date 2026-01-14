import { Inject } from "./inject";
import { Injectable } from "./injectable";
import { InjectionToken } from "./injection-token";
export enum LoggerLevel {
    trace = 0,
    debug = 1,
    info = 2,
    warn = 3,
    error = 4
}
export const LOGGER_LEVEL = new InjectionToken<LoggerLevel>(`LOGGER_LEVEL`, {
    factory: () => LoggerLevel.info
})
@Injectable()
export class Logger {
    name: string = `default`
    constructor(@Inject(LOGGER_LEVEL, { optional: true }) private level: LoggerLevel = LoggerLevel.info) { }
    private timestamp(): string {
        const now = new Date()
        const iso = now.toISOString()
        return iso.replace('T', ' ').slice(0, 19)
    }

    _log(level: LoggerLevel, ...args: any[]) {
        if (level >= this.level) {
            const ts = this.timestamp()
            const prefix = `[${ts}]`
            const taggedArgs = args.map(arg => typeof arg === 'string' ? `${prefix} ${arg}` : arg)
            switch (level) {
                case LoggerLevel.trace:
                    console.trace(...taggedArgs)
                    break;
                case LoggerLevel.debug:
                    console.debug(...taggedArgs)
                    break;
                case LoggerLevel.info:
                    console.info(...taggedArgs)
                    break;
                case LoggerLevel.warn:
                    console.warn(...taggedArgs)
                    break;
                case LoggerLevel.error:
                    console.error(...taggedArgs)
                    break;
                default:
                    console.log(...taggedArgs)
                    break;
            }
        }
    }
    trace(...args: any[]) {
        this._log(LoggerLevel.trace, ...args)
    }

    verbose(...args: any[]) {
        this._log(LoggerLevel.trace, ...args)
    }

    debug(...args: any[]) {
        this._log(LoggerLevel.debug, ...args)
    }

    info(...args: any[]) {
        this._log(LoggerLevel.info, ...args)
    }
    log(...args: any[]) {
        this._log(LoggerLevel.info, ...args)
    }
    warn(...args: any[]) {
        this._log(LoggerLevel.warn, ...args)
    }

    error(...args: any[]) {
        this._log(LoggerLevel.error, ...args)
    }
}

export const logger = new Logger(LoggerLevel.info)
export function createLogger(name: string, level: LoggerLevel = LoggerLevel.info) {
    const logger = new Logger(level)
    logger.name = name;
    return logger;
}