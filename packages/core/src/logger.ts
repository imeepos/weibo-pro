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
    name: string = `default`
    constructor(@Inject(LOGGER_LEVEL, { optional: true }) private level: LoggerLevel = LoggerLevel.info) { }
    _log(level: LoggerLevel, ...args: any[]) {
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