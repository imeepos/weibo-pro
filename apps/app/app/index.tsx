import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from '../components/ui/image';
import { PointsIcon, SearchIcon, MessageIcon, MyIcon, VideoIcon, DownArrowIcon } from '../components/icon';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 48) / 2;

const cardData = [
    { id: 1, title: '宠物写真', image: require('@/assets/images/image-17.png'), isHot: true, users: 6349, height: 214 },
    { id: 2, title: '我和小猫的人生合照', image: require('@/assets/images/image-17.png'), users: 6349, height: 236 },
    { id: 3, title: '猫：晚安～人', image: require('@/assets/images/image-17.png'), users: 6349, height: 214 },
    { id: 4, title: '穿越时空的相聚', image: require('@/assets/images/image-17.png'), users: 6349, height: 100 },
    { id: 5, title: '睡衣版猫咪', image: require('@/assets/images/image-17.png'), users: 6349, height: 120 },
    { id: 6, title: '猫咪写真', image: require('@/assets/images/image-17.png'), users: 6349, height: 214 },
    { id: 7, title: '站姐视角写真', image: require('@/assets/images/image-17.png'), users: 6349, height: 214 },
    { id: 8, title: '猫咪写真', image: require('@/assets/images/image-17.png'), users: 6349, height: 200 },
];

const tabs = ['精选推荐', '圣诞限定', '萌宠', '分身趣玩场', '图趣小剧场'];

export default function HomeScreen() {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <SafeAreaView className="flex-1 bg-black" edges={['top']}>
            {/* Header */}
            <View className="bg-black pt-2 pb-3">
                <View className="flex-row justify-between items-center px-4">
                    <Text className="text-white text-lg font-bold">Popcore</Text>
                    <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                            <PointsIcon />
                            <Text className="text-white text-sm font-semibold">60</Text>
                        </View>
                        <Pressable className="p-1">
                            <SearchIcon />
                        </Pressable>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerClassName="pb-20" showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View className="flex-row px-4 pt-4 gap-3 mb-4">
                    <View className="flex-1 rounded-xl overflow-hidden">
                        <Image
                            source={require('@/assets/images/image-17.png')}
                            className="w-full h-[200px]"
                            contentFit="cover"
                        />
                        <View className="p-3 bg-black/60">
                            <Text className="text-white text-sm font-semibold mb-1">全家福这不就来了吗！</Text>
                            <Text className="text-white text-xs opacity-80">一家人最紧要整整齐齐</Text>
                        </View>
                    </View>
                    <View className="w-[120px] rounded-xl overflow-hidden">
                        <Image
                            source={require('@/assets/images/image-17.png')}
                            className="w-full h-[140px]"
                            contentFit="cover"
                        />
                        <View className="p-2 bg-black/60">
                            <Text className="text-white text-xs font-medium mb-0.5" numberOfLines={1}>
                                麻 我们也要去疯狂动物城
                            </Text>
                            <Text className="text-white text-[11px] opacity-90" numberOfLines={1}>
                                泥嚎 我是动物城的新居民🫡
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4"
                    contentContainerClassName="px-4 gap-5 items-center"
                >
                    {tabs.map((tab, index) => (
                        <Pressable key={index} onPress={() => setActiveTab(index)} className="pb-2 relative">
                            <Text className={`text-sm ${activeTab === index ? 'text-white font-semibold' : 'text-white/60'}`}>
                                {tab}
                            </Text>
                            {activeTab === index && (
                                <LinearGradient
                                    colors={['#9966FF', '#FF6699']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-sm"
                                />
                            )}
                        </Pressable>
                    ))}
                    <Pressable className="p-1">
                        <DownArrowIcon />
                    </Pressable>
                </ScrollView>

                {/* Grid */}
                <View className="flex-row flex-wrap px-4 gap-4">
                    {cardData.map((card) => (
                        <View key={card.id} style={{ width: CARD_WIDTH }} className="mb-4">
                            <View
                                className="w-full rounded-xl overflow-hidden mb-2 relative"
                                style={{ height: card.height || CARD_WIDTH * 1.2 }}
                            >
                                <Image source={card.image} className="w-full h-full" contentFit="cover" />
                                {card.isHot && (
                                    <View className="absolute top-2 left-2 bg-red-500/90 px-1.5 py-0.5 rounded flex-row items-center gap-0.5">
                                        <Text className="text-[10px]">🔥</Text>
                                        <Text className="text-white text-[10px] font-semibold">热门模板</Text>
                                    </View>
                                )}
                                <View className="absolute top-2 right-2 flex-row items-center gap-0.5 bg-black/70 px-1.5 py-0.5 rounded">
                                    <PointsIcon />
                                    <Text className="text-white text-[10px]">{card.users}人用过</Text>
                                </View>
                            </View>
                            <Text className="text-white text-xs font-medium" numberOfLines={1}>
                                {card.title}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Bottom Nav */}
            <View className="flex-row justify-around items-center pt-3 pb-8 bg-black border-t border-white/10 min-h-[83px]">
                <Pressable className="items-center gap-1">
                    <LinearGradient
                        colors={['#9966FF', '#FF6699', '#FF9966']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="w-6 h-6 justify-center items-center rounded-xl"
                    >
                        <VideoIcon />
                    </LinearGradient>
                    <Text className="text-white text-xs font-semibold">视频</Text>
                </Pressable>
                <Pressable className="items-center gap-1">
                    <View className="w-6 h-6 justify-center items-center rounded-xl">
                        <MessageIcon />
                    </View>
                    <Text className="text-white/60 text-xs">消息</Text>
                </Pressable>
                <Pressable className="items-center gap-1">
                    <View className="w-6 h-6 justify-center items-center rounded-xl">
                        <MyIcon />
                    </View>
                    <Text className="text-white/60 text-xs">我的</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
