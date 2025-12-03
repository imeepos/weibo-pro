
export const CLOUDFLARE_ZONE = `popcore.ai`

const isVideo = (url: string): boolean => {
    const videoExts = /\.(mp4|mov|avi|webm|m4v|mkv|flv|wmv)$/i;
    return videoExts.test(url);
};

export function useResource(source: string | { uri: string }, options: {
    time?: string;
    width?: number;
    height?: number;
    fit?: 'contain' | 'scale-down' | 'cover';
    format?: 'jpg' | 'png';
} = {}) {
    const videoSource = typeof source === "string" ? source : source.uri;
    const isVideoFile = isVideo(videoSource);

    return {
        source: isVideoFile ? getVideoThumbnail(videoSource) : videoSource,
        poster: isVideoFile ? getVideoUrl(videoSource) : videoSource
    }
}

// 首帧图
const getVideoThumbnail = (
    videoUrl: string,
    options: {
        time?: string;
        width?: number;
        height?: number;
        fit?: 'contain' | 'scale-down' | 'cover';
        format?: 'jpg' | 'png';
    } = {}
): string => {
    if (videoUrl.startsWith(`https://${CLOUDFLARE_ZONE}`)) {
        return videoUrl;
    }
    const opts: string[] = ['mode=frame'];

    if (options?.time) opts.push(`time=${options.time}`);
    if (options?.width) opts.push(`width=${options.width}`);
    if (options?.height) opts.push(`height=${options.height}`);
    if (options?.fit) opts.push(`fit=${options.fit}`);
    if (options?.format) opts.push(`format=${options.format}`);

    const optionsString = opts.join(',');
    return `https://${CLOUDFLARE_ZONE}/cdn-cgi/media/${optionsString}/${videoUrl}`;
};

const getVideoUrl = (videoUrl: string) => {
    if (videoUrl.startsWith(`https://${CLOUDFLARE_ZONE}`)) {
        return videoUrl;
    }
    return `https://${CLOUDFLARE_ZONE}/cdn-cgi/media/mode=video,audio=false/${videoUrl}`;
}
