import { useVideoPlayer, VideoView } from "expo-video";
import { forwardRef, useEffect, useState } from "react";
import { View, Pressable, Text, ActivityIndicator } from "react-native";
import { cn } from "../../lib/utils";
import { Image } from "./image";

interface VideoPlayerProps {
  source: string | { uri: string };
  poster?: string;
  visible?: boolean;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  onError?: (error: string) => void;
  onLoad?: () => void;
}

const VideoPlayer = forwardRef<VideoView, VideoPlayerProps>(
  (
    {
      source,
      poster,
      visible = true,
      className,
      autoPlay = false,
      loop = false,
      muted = false,
      controls = true,
      onError,
      onLoad,
    },
    ref
  ) => {
    const videoSource = typeof source === "string" ? { uri: source } : source;

    const player = useVideoPlayer(videoSource, (player) => {
      player.loop = loop;
      player.muted = muted;
    });

    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showPoster, setShowPoster] = useState(!!poster);

    useEffect(() => {
      if (!visible) {
        player.pause();
        if (poster) {
          setShowPoster(true);
        }
        return;
      }

      if (autoPlay && visible) {
        player.play();
      }
    }, [visible, autoPlay, player, poster]);

    useEffect(() => {
      const playingSubscription = player.addListener("playingChange", ({ isPlaying }) => {
        setIsPlaying(isPlaying);
        if (isPlaying) {
          setShowPoster(false);
        }
      });

      const statusSubscription = player.addListener("statusChange", (payload) => {
        if (payload.status === "readyToPlay") {
          setIsLoading(false);
          onLoad?.();
        }

        if (payload.status === "error" && payload.error) {
          onError?.(payload.error.message);
        }
      });

      return () => {
        playingSubscription.remove();
        statusSubscription.remove();
      };
    }, [player, onError, onLoad]);

    const togglePlayback = () => {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
        setShowPoster(false);
      }
    };

    return (
      <View className={cn("!relative !bg-black !overflow-hidden", className)}>
        {visible && (
          <VideoView
            ref={ref}
            player={player}
            style={{ position: 'absolute', inset: 0 }}
            nativeControls={false}
            contentFit="cover"
          />
        )}

        {showPoster && poster && (
          <Image
            src={poster}
            style={{ position: 'absolute', inset: 0 }}
            contentFit="cover"
          />
        )}


        {controls && !isLoading && visible && (
          <Pressable
            onPress={togglePlayback}
            className="absolute inset-0 items-center justify-center active:opacity-80"
          >
            {(!isPlaying || showPoster) && (
              <View className="w-16 h-16 items-center justify-center bg-black/50 rounded-full">
                <Text className="text-white text-2xl">▶</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";

export { VideoPlayer, type VideoPlayerProps };
