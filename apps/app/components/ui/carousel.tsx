import React, { useState, useRef } from "react";
import { View as RNView, Dimensions, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import RNCarousel, { ICarouselInstance } from "react-native-reanimated-carousel";
import { cn } from "../../lib/utils";

// 扩展 View 以支持 className（NativeWind）
const View = RNView as React.ComponentType<ViewProps & { className?: string }>;

const { width: screenWidth } = Dimensions.get("window");

export type CarouselApi = ICarouselInstance;

type CarouselProps = {
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
  className?: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  loop?: boolean;
};

type CarouselContextProps = {
  api: CarouselApi | null;
  orientation: "horizontal" | "vertical";
  width: number;
  height: number;
  autoPlay: boolean;
  autoPlayInterval: number;
  loop: boolean;
};

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

function Carousel({
  orientation = "horizontal",
  setApi,
  className,
  children,
  width = screenWidth,
  height = 410,
  autoPlay = false,
  autoPlayInterval = 3000,
  loop = true,
}: CarouselProps) {
  const [api, setInternalApi] = useState<CarouselApi | null>(null);
  const carouselRef = useRef<ICarouselInstance>(null);

  React.useEffect(() => {
    if (carouselRef.current) {
      const instance = carouselRef.current;
      setInternalApi(instance);
      setApi?.(instance);
    }
  }, [setApi]);

  // 提取子元素到数组，过滤掉非 ReactElement 的内容
  const items = React.Children.toArray(children).filter(
    (child): child is React.ReactElement => React.isValidElement(child)
  );

  return (
    <CarouselContext.Provider
      value={{
        api,
        orientation,
        width,
        height,
        autoPlay,
        autoPlayInterval,
        loop,
      }}
    >
      <View className={cn("relative", className)}>
        <RNCarousel
          ref={carouselRef}
          loop={loop}
          width={width}
          height={height}
          autoPlay={autoPlay}
          autoPlayInterval={autoPlayInterval}
          data={items}
          scrollAnimationDuration={500}
          vertical={orientation === "vertical"}
          renderItem={({ item }) => item as React.ReactElement}
        />
      </View>
    </CarouselContext.Provider>
  );
}

function CarouselContent({
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  // CarouselContent 在新架构中主要用于包裹 CarouselItem
  // 实际渲染由 Carousel 的 renderItem 处理
  return <>{children}</>;
}

function CarouselItem({
  className,
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { width, height } = useCarousel();

  return (
    <View
      className={cn("flex justify-center items-center", className)}
      style={{ width, height }}
      {...props}
    >
      {children}
    </View>
  );
}

export { Carousel, CarouselContent, CarouselItem, useCarousel };
