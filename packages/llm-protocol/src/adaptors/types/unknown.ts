

export interface UnknownRequest {
    prompt: string;
    model: string;
    max_tokens: number;
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: string;
    stop: string[];
}

export function isUnknownRequest(val: any): val is UnknownRequest{
    return val && val.prompt;
}