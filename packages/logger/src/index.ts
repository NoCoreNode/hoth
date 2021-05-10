import fs from 'fs-extra';
import path from 'path';
import pino from 'pino';
import type {FastifyRequest, FastifyReply} from 'fastify';

import stream from './stream';
import {noticeSym, performanceSym} from './constants';

interface LoggerOptions {
    apps: Array<{name: string}>;
    rootPath: string;
}

interface StreamItem {
    fullpath: string;
    level: string;
    app: string;
}

export default function (options: LoggerOptions) {
    let {
        apps,
        rootPath,
    } = options;

    let streams: StreamItem[] = [];

    apps = [{name: 'hoth'}, ...apps];

    for (const {name} of apps) {
        const logPath = path.join(rootPath, 'log', name);
        fs.ensureDirSync(logPath);
        const files = [
            `${name}.log.ti`,
            `${name}.log`,
            `${name}.log.wf`,
        ];
        const levels = ['trace', 'notice', 'warn'];
        for (let i = 0; i < files.length; i++) {
            const fullpath = path.join(logPath, files[i]);
            // if (!fs.existsSync(fullpath)) {
            //     fs.ensureFileSync(fullpath);
            // }
            streams.push({
                app: name,
                fullpath,
                level: levels[i],
            });
        }
    }

    const logger = pino({
        level: process.env.NODE_ENV === 'development' ? 'trace' : 'info',
        customLevels: {
            notice: 35,
        },
        serializers: {
            res(reply) {
                return {
                    statusCode: reply.statusCode,
                };
            },
            req(request) {
                return {
                    method: request.method,
                    url: request.url,
                    parameters: request.parameters,
                    headers: request.headers,
                    ip: request.ip,
                    module: request.module,
                    product: request.product,
                    logid: request.logid,
                    notices: request[noticeSym],
                    performance: request[performanceSym],
                };
            },
            err: pino.stdSerializers.err,
        },
    }, stream(streams));

    return logger;
}

declare module 'fastify' {
    interface FastifyRequest {
        [noticeSym]: {
            [key: string]: string;
        };
        [performanceSym]: {
            [key: string]: number[];
        };
    }

    interface FastifyLoggerInstance {
        addNotice: (key: string, value: string) => void;
        addPerformance: (name: string, value: number) => void;
    }
}



export function preHandler(req: FastifyRequest, reply: FastifyReply, done) {
    req[noticeSym] = {};
    req[performanceSym] = {};
    req.log.addNotice = (key: string, value: string) => {
        req[noticeSym][key] = value;
    };
    req.log.addPerformance = (key: string, value: number) => {
        if (!req[performanceSym][key]) {
            req[performanceSym][key] = [0, 0];
        }
        req[performanceSym][key][0]++;
        req[performanceSym][key][1] += value;
    };
    done();
}
