import { describe, expect, it } from 'vitest'
import { WeiboHtmlParser } from './WeiboHtmlParser'

describe('WeiboHtmlParser', () => {
  it('应从相对路径详情链接中提取 uid 和 mid', () => {
    const parser = new WeiboHtmlParser()
    const html = `
      <html>
        <body>
          <div class="card-wrap">
            <div class="card">
              <div class="from">
                <a href="/7941463033/QyYEZis65?refer_flag=1001030103_" target="_blank">04月07日 09:39</a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const result = parser.parseSearchResultHtml(html)

    expect(result.posts).toEqual([
      {
        uid: '7941463033',
        mid: 'QyYEZis65',
        postAt: expect.any(Date)
      }
    ])
  })
})
