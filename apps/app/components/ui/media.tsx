import { forwardRef, useMemo } from "react";
import { VideoView } from "expo-video";
import { Image } from "./image";
import { VideoPlayer, type VideoPlayerProps } from "./video";
import { cn } from "@/lib/utils";

type MediaType = "image" | "video";

interface MediaProps extends Omit<VideoPlayerProps, "source"> {
  source: string | { uri: string };
  type?: MediaType;
  poster?: string;
  visible?: boolean;
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv|3gp)$/i;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;

const detectMediaType = (source: string | { uri: string }): MediaType => {
  const uri = typeof source === "string" ? source : source.uri;

  if (VIDEO_EXTENSIONS.test(uri)) {
    return "video";
  }

  if (IMAGE_EXTENSIONS.test(uri)) {
    return "image";
  }

  return "image";
};

const Media = forwardRef<VideoView, MediaProps>(
  ({ source, type, poster, visible = true, className, ...props }, ref) => {
    const mediaType = useMemo(
      () => type || detectMediaType(source),
      [source, type]
    );
    if (mediaType === "video") {
      return (
        <VideoPlayer
          ref={ref}
          source={source}
          poster={poster}
          visible={visible}
          className={cn('w-full h-full', className)}
          autoPlay
          {...props}
        />
      );
    }

    return (
      <Image
        source={source}
        className={cn('w-full h-full', className)}
        contentFit="cover"
      />
    );
  }
);

Media.displayName = "Media";

export { Media, type MediaProps, type MediaType };
