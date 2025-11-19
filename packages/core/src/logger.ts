import { root } from "./environment-injector";
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
export const LOGGER_LEVEL = new InjectionToken<LoggerLevel>(`LOGGER_LEVEL`)
@Injectable()
export class Logger {
    constructor(@Inject(LOGGER_LEVEL, { optional: true }) private level: LoggerLevel = LoggerLevel.info) { }
    log(level: LoggerLevel, ...args: any[]) {
        if (level >= this.level) {
            switch (level) {
                case LoggerLevel.trace:
                    console.trace(...args)
                    break;
                case LoggerLevel.debug:
                    console.debug(...args)
                    break;
                case LoggerLevel.info:
                    console.info(...args)
                    break;
                case LoggerLevel.warn:
                    console.warn(...args)
                    break;
                case LoggerLevel.error:
                    console.error(...args)
                    break;
                default:
                    console.log(...args)
                    break;
            }
        }
    }
    trace(...args: any[]) {
        this.trace(LoggerLevel.trace, ...args)
    }

    debug(...args: any[]) {
        this.trace(LoggerLevel.debug, ...args)
    }

    info(...args: any[]) {
        this.trace(LoggerLevel.info, ...args)
    }

    warn(...args: any[]) {
        this.trace(LoggerLevel.warn, ...args)
    }

    error(...args: any[]) {
        this.trace(LoggerLevel.error, ...args)
    }
}