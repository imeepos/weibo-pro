import { Text, View, Image } from 'react-native';
import {
  StatusBar
} from 'expo-status-bar';
import "./global.css"
import { Button } from '../components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from '../components/ui/carousel';

export default function HomeScreen() {
  return (
    <View className='flex-1 text-slate-100 rounded-xl'>
      <StatusBar />
      <Carousel className='relative w-full'>
        <CarouselContent>
          {Array.from({ length: 5 }).map((_, index) => (
            <CarouselItem key={index} className='w-full h-[410]'>
              <Image
                source={require('@/assets/images/image-17.png')}
                style={{ width: '100%', height: '100%' }}
                className='w-full h-full'
                resizeMode='cover'
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* 这里是... */}
        <div style={{
          background: 'linear-gradient(rgb(9 10 11 / 0%) 9.64%, rgb(9 10 11) 100%)'
        }} className="absolute top-[327] w-full h-[83]"></div>
        <div className="absolute top-[366] left-4 w-[58] h-1 opacity-100 rounded-full flex">
          {Array.from({ length: 5 }).map((_, index) => (<div className=''>{index}</div>))}
        </div>
      </Carousel>
    </View>
  );
}
