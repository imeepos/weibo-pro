import { CookieJar as ToughCookieJar, Cookie } from 'tough-cookie';

export class CookieJar {
  private jar: ToughCookieJar;

  constructor() {
    this.jar = new ToughCookieJar();
  }

  async setCookie(cookie: string, url: string): Promise<void> {
    await this.jar.setCookie(cookie, url);
  }

  async getCookies(url: string): Promise<Cookie[]> {
    return this.jar.getCookies(url);
  }

  async getCookieString(url: string): Promise<string> {
    const cookies = await this.getCookies(url);
    return cookies.map(c => `${c.key}=${c.value}`).join('; ');
  }

  async clear(): Promise<void> {
    await this.jar.removeAllCookies();
  }

  serialize(): string {
    return JSON.stringify(this.jar.serializeSync());
  }

  static deserialize(data: string): CookieJar {
    const jar = new CookieJar();
    jar.jar = ToughCookieJar.deserializeSync(JSON.parse(data));
    return jar;
  }
}
