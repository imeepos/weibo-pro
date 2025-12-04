
export const CLOUDFLARE_ZONE = `popcore.ai`

const isVideo = (url: string): boolean => {
    const videoExts = /\.(mp4|mov|avi|webm|m4v|mkv|flv|wmv)$/i;
    return videoExts.test(url);
};

export function useResource(source: any, options: {
    time?: string;
    width?: number;
    height?: number;
    fit?: 'contain' | 'scale-down' | 'cover';
    format?: 'jpg' | 'png';
} = {}) {
    // 处理 React Native 的本地资源（require 返回数字）
    if (typeof source === "number") {
        return { source, poster: source };
    }

    const videoSource = typeof source === "string" ? source : source?.uri;

    if (!videoSource) {
        return { source, poster: source };
    }

    const isVideoFile = isVideo(videoSource);

    return {
        source: isVideoFile ? getVideoUrl(videoSource, { width: options.width, height: options.height }) : videoSource,
        poster: isVideoFile ? getVideoThumbnail(videoSource, options) : undefined
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

const getVideoUrl = (
    videoUrl: string,
    options: {
        width?: number;
        height?: number;
    } = {}
) => {
    if (videoUrl.startsWith(`https://${CLOUDFLARE_ZONE}`)) {
        return videoUrl;
    }

    const opts: string[] = ['mode=video', 'audio=false'];

    if (options?.width) opts.push(`width=${options.width}`);
    if (options?.height) opts.push(`height=${options.height}`);

    const optionsString = opts.join(',');
    return `https://${CLOUDFLARE_ZONE}/cdn-cgi/media/${optionsString}/${videoUrl}`;
}
