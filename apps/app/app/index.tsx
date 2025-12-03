import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import "./global.css"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, CancelAlertDialogAction, DeleteAlertDialogAction } from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button';
import { Media } from '../components/ui/media';
import { MediaCarousel } from '../components/blocks';

export default function HomeScreen() {
  const carouselSources = Array.from({ length: 5 }).map((_, i) => {
    if (i % 2 === 0) {
      return `https://cdn.roasmax.cn/upload/42c9ea80d79b44cfab292b10f991f39f.mp4`
    }
    return require('@/assets/images/image-17.png')
  });

  return (
    <View className='flex-1 text-slate-100 rounded-xl'>
      <StatusBar />
      <MediaCarousel sources={carouselSources} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="gradient">打开对话框</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className='w-[250]' style={{ backgroundColor: `#16181B` }}>
          <AlertDialogHeader>
            <AlertDialogTitle>确认操作</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销，请谨慎操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ display: 'flex', flexDirection: 'row' }} className='gap-2'>
            <CancelAlertDialogAction />
            <DeleteAlertDialogAction />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <View className='!grap-6 !mt-2 !px-2 !flex-row'>
        <View className='w-[177] h-[214] border-radius-16'>
          <Media visible={false} source={require('@/assets/images/demo-1.png')} className='border-radius-16' />
        </View>
        <Media visible={false} source={`https://cdn.roasmax.cn/upload/42c9ea80d79b44cfab292b10f991f39f.mp4`} className='w-[177] h-[214] border-radius-16' />
      </View>
    </View>
  );
}
