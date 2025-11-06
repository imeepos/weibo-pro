declare module '@sker/nlp' {
  export interface PostContext {
    postId: string
    content: string
    comments: string[]
    subComments: string[]
    reposts: string[]
  }

  export class NLPAnalyzer {
    analyze(context: PostContext, availableCategories: string[], availableTags: string[]): Promise<any>
  }
}