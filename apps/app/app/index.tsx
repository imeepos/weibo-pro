import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Pressable, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from '../components/ui/image';
import { PointsIcon, SearchIcon, MessageIcon, MyIcon, VideoIcon, DownArrowIcon } from '../components/icon';

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - 48) / 2; // 两列布局，左右各16px边距，中间16px间距

// 卡片数据 - 根据 Figma 设计更新
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

// 标签数据 - 根据 Figma 设计更新
const tabs = ['精选推荐', '圣诞限定', '萌宠', '分身趣玩场', '图趣小剧场'];

export default function HomeScreen() {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />
            <RNStatusBar barStyle="light-content" />

            {/* 顶部状态栏和标题栏 */}
            <View style={styles.header}>
                <View style={styles.statusBar}>
                    <Text style={styles.time}>9:41</Text>
                    <View style={styles.statusIcons}>
                        <View style={styles.signalBars} />
                        <View style={styles.wifiIcon} />
                        <View style={styles.batteryIcon} />
                    </View>
                </View>
                <View style={styles.titleBar}>
                    <Text style={styles.appTitle}>Popcore</Text>
                    <View style={styles.headerRight}>
                        <View style={styles.pointsContainer}>
                            <PointsIcon />
                            <Text style={styles.pointsText}>60</Text>
                        </View>
                        <Pressable style={styles.searchButton}>
                            <SearchIcon />
                        </Pressable>
                    </View>
                </View>
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 英雄图片区域 */}
                <View style={styles.heroSection}>
                    <View style={styles.heroMain}>
                        <Image
                            source={require('@/assets/images/image-17.png')}
                            style={styles.heroMainImage}
                            contentFit="cover"
                        />
                        <View style={styles.heroTextContainer}>
                            <Text style={styles.heroText}>全家福这不就来了吗！</Text>
                            <Text style={styles.heroSubtext}>一家人最紧要整整齐齐</Text>
                        </View>
                    </View>
                    <View style={styles.heroSide}>
                        <Image
                            source={require('@/assets/images/image-17.png')}
                            style={styles.heroSideImage}
                            contentFit="cover"
                        />
                        <View style={styles.heroSideTextContainer}>
                            <Text style={styles.heroSideText} numberOfLines={1}>
                                麻 我们也要去疯狂动物城
                            </Text>
                            <Text style={styles.heroSideSubtext} numberOfLines={1}>
                                泥嚎 我是动物城的新居民🫡
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 标签导航 */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsContent}
                >
                    {tabs.map((tab, index) => (
                        <Pressable
                            key={index}
                            onPress={() => setActiveTab(index)}
                            style={styles.tab}
                        >
                            <Text style={[
                                styles.tabText,
                                activeTab === index && styles.tabTextActive
                            ]}>
                                {tab}
                            </Text>
                            {activeTab === index && (
                                <LinearGradient
                                    colors={['#9966FF', '#FF6699']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.tabUnderline}
                                />
                            )}
                        </Pressable>
                    ))}
                    <Pressable style={styles.tabArrow}>
                        <DownArrowIcon />
                    </Pressable>
                </ScrollView>

                {/* 内容网格 */}
                <View style={styles.gridContainer}>
                    {cardData.map((card, index) => (
                        <View 
                            key={card.id} 
                            style={[
                                styles.card,
                                index % 2 === 0 ? styles.cardLeft : styles.cardRight
                            ]}
                        >
                            <View style={[styles.cardImageContainer, { height: card.height || CARD_WIDTH * 1.2 }]}>
                                <Image
                                    source={card.image}
                                    style={styles.cardImage}
                                    contentFit="cover"
                                />
                                {card.isHot && (
                                    <View style={styles.hotBadge}>
                                        <Text style={styles.hotEmoji}>🔥</Text>
                                        <Text style={styles.hotText}>热门模板</Text>
                                    </View>
                                )}
                                <View style={styles.cardOverlay}>
                                    <PointsIcon />
                                    <Text style={styles.cardOverlayText}>{card.users}人用过</Text>
                                </View>
                            </View>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {card.title}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* 底部导航栏 */}
            <View style={styles.bottomNav}>
                <Pressable style={styles.navItem}>
                    <LinearGradient
                        colors={['#9966FF', '#FF6699', '#FF9966']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.navIconContainer}
                    >
                        <VideoIcon />
                    </LinearGradient>
                    <Text style={styles.navTextActive}>视频</Text>
                </Pressable>
                <Pressable style={styles.navItem}>
                    <View style={styles.navIconContainer}>
                        <MessageIcon />
                    </View>
                    <Text style={styles.navText}>消息</Text>
                </Pressable>
                <Pressable style={styles.navItem}>
                    <View style={styles.navIconContainer}>
                        <MyIcon />
                    </View>
                    <Text style={styles.navText}>我的</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        backgroundColor: '#000000',
        paddingTop: 8,
        paddingBottom: 12,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    time: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    statusIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    signalBars: {
        width: 18,
        height: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },
    wifiIcon: {
        width: 16,
        height: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },
    batteryIcon: {
        width: 24,
        height: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },
    titleBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    appTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pointsText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    searchButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    heroSection: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
        marginBottom: 16,
    },
    heroMain: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    heroMainImage: {
        width: '100%',
        height: 200,
    },
    heroTextContainer: {
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    heroText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    heroSubtext: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.8,
    },
    heroSide: {
        width: 120,
        borderRadius: 12,
        overflow: 'hidden',
    },
    heroSideImage: {
        width: '100%',
        height: 140,
    },
    heroSideTextContainer: {
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    heroSideText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },
    heroSideSubtext: {
        color: '#FFFFFF',
        fontSize: 11,
        opacity: 0.9,
    },
    tabsContainer: {
        marginBottom: 16,
    },
    tabsContent: {
        paddingHorizontal: 16,
        gap: 20,
        alignItems: 'center',
    },
    tab: {
        paddingBottom: 8,
        position: 'relative',
    },
    tabText: {
        color: '#FFFFFF',
        fontSize: 14,
        opacity: 0.6,
    },
    tabTextActive: {
        opacity: 1,
        fontWeight: '600',
    },
    tabUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        borderRadius: 1,
    },
    tabArrow: {
        padding: 4,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 16,
    },
    card: {
        width: CARD_WIDTH,
        marginBottom: 16,
    },
    cardLeft: {
        marginRight: 0,
    },
    cardRight: {
        marginLeft: 0,
    },
    cardImageContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    hotBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(255, 68, 68, 0.9)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    hotEmoji: {
        fontSize: 10,
    },
    hotText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    cardOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
    },
    cardOverlayText: {
        color: '#FFFFFF',
        fontSize: 10,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 32,
        backgroundColor: '#000000',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        minHeight: 83,
    },
    navItem: {
        alignItems: 'center',
        gap: 4,
    },
    navIconContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    navText: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.6,
    },
    navTextActive: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 1,
        fontWeight: '600',
    },
});
