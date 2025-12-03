import { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import "./global.css"
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '../components/ui/carousel';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button';
const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    // 监听轮播变化
    const timer = setInterval(() => {
      const currentIndex = api.getCurrentIndex();
      setCurrent(currentIndex);
    }, 100);

    return () => clearInterval(timer);
  }, [api]);

  return (
    <View className='flex-1 text-slate-100 rounded-xl'>
      <StatusBar />
      <View style={styles.carouselContainer}>
        <Carousel
          className='relative w-full'
          setApi={setApi}
          width={screenWidth}
          height={410}
          loop={true}
          autoPlay={false}
        >
          <CarouselContent>
            {Array.from({ length: 5 }).map((_, index) => (
              <CarouselItem key={index} className='w-full h-full'>
                <Image
                  source={require('@/assets/images/image-17.png')}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode='cover'
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* 渐变遮罩 */}
        <LinearGradient
          colors={['rgba(9, 10, 11, 0)', 'rgba(9, 10, 11, 1)']}
          locations={[0.0964, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />

        {/* 轮播指示器 */}
        <View style={styles.indicatorContainer} pointerEvents="none">
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                current === index ? styles.indicatorActive : styles.indicatorInactive,
              ]}
            />
          ))}
        </View>
      </View>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">打开对话框</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认操作</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，请谨慎操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction>继续</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    position: 'relative',
    width: '100%',
    height: 410,
  },
  gradient: {
    position: 'absolute',
    top: 327,
    left: 0,
    right: 0,
    height: 83,
  },
  indicatorContainer: {
    position: 'absolute',
    top: 366,
    left: 16,
    flexDirection: 'row',
    gap: 4,
  },
  indicator: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    width: 10,
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  indicatorInactive: {
    width: 4,
  },
});
