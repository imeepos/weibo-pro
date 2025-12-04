import { useState } from 'react';
import { Dimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Carousel, CarouselContent, CarouselItem } from '../ui/carousel';
import { Media } from '../ui/media';
import { useResource } from '@/hooks/use-resource';

const { width: screenWidth } = Dimensions.get('window');

interface MediaCarouselProps {
  sources: any[];
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
}

export function MediaCarousel({
  sources,
  width = screenWidth,
  height = 410,
  autoPlay = false,
  loop = true,
}: MediaCarouselProps) {
  const [current, setCurrent] = useState(0);

  return (
    <View className="!relative !w-full" style={{ height }}>
      <Carousel
        className='relative w-full'
        width={width}
        height={height}
        loop={loop}
        autoPlay={autoPlay}
        onIndexChange={setCurrent}
      >
        <CarouselContent>
          {sources.map((_source, index) => {
            const { source, poster } = useResource(_source, { width: screenWidth })
            return (
              <CarouselItem key={index} className='w-full h-full'>
                <Media
                  source={source}
                  poster={poster}
                  visible={current === index}
                  loop={true}
                  className='w-full h-full'
                />
              </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>

      <LinearGradient
        colors={['rgba(9, 10, 11, 0)', 'rgba(9, 10, 11, 1)']}
        locations={[0.0964, 1]}
        className="absolute left-0 right-0 h-[83px]"
        style={{ top: 327 }}
        pointerEvents="none"
      />

      <View className="absolute flex-row gap-1" style={{ top: 366, left: 16 }} pointerEvents="none">
        {sources.map((_, index) => (
          <View
            key={index}
            className={`h-1 rounded-sm ${current === index
              ? 'w-[10px] bg-white'
              : 'w-1 bg-white/50'
              }`}
          />
        ))}
      </View>
    </View>
  );
}
