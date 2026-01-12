import { describe, it, expect, beforeEach } from 'vitest';
import { HelloService } from './hello.service';

describe('HelloService', () => {
    let service: HelloService;

    beforeEach(() => {
        service = new HelloService();
    });

    describe('getHello', () => {
        it('should return hello message', () => {
            const result = service.getHello();
            expect(result).toBe('Hello World from @sker/core!');
        });

        it('should return string type', () => {
            const result = service.getHello();
            expect(typeof result).toBe('string');
        });
    });
});
