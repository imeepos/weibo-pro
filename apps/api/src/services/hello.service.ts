import { Injectable } from '@sker/core';

@Injectable({ providedIn: 'root' })
export class HelloService {
  getHello(): string {
    return 'Hello World from @sker/core!';
  }
}
