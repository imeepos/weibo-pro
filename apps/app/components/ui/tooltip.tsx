import * as React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  type ViewStyle,
  type TextStyle,
  LayoutChangeEvent,
  StyleSheet,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { cn } from "../../lib/utils";

type Side = "top" | "bottom" | "left" | "right";

interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<View | null>;
  side: Side;
  sideOffset: number;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

const useTooltipContext = () => {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip components must be used within TooltipProvider");
  }
  return context;
};

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delayDuration = 200,
}) => {
  return <>{children}</>;
};

interface TooltipProps {
  children: React.ReactNode;
  side?: Side;
  sideOffset?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  side = "top",
  sideOffset = 8,
}) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<View | null>(null);

  const value: TooltipContextValue = {
    open,
    setOpen,
    triggerRef,
    side,
    sideOffset,
  };

  return (
    <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
  );
};

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  style?: ViewStyle;
}

const TooltipTrigger = React.forwardRef<View, TooltipTriggerProps>(
  ({ children, asChild, style }, ref) => {
    const { setOpen, triggerRef } = useTooltipContext();

    const handleRef = (node: View | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref: handleRef,
        onPressIn: () => setOpen(true),
        onPressOut: () => setOpen(false),
      });
    }

    return (
      <Pressable
        ref={handleRef as any}
        onPressIn={() => setOpen(true)}
        onPressOut={() => setOpen(false)}
        style={style}
      >
        {children}
      </Pressable>
    );
  }
);

TooltipTrigger.displayName = "TooltipTrigger";

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const TooltipContent = React.forwardRef<View, TooltipContentProps>(
  ({ children, className, style, textStyle }, ref) => {
    const { open, triggerRef, side, sideOffset } = useTooltipContext();
    const [layout, setLayout] = React.useState<{
      width: number;
      height: number;
    } | null>(null);
    const [triggerLayout, setTriggerLayout] = React.useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);

    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.95);

    React.useEffect(() => {
      if (open && triggerRef.current) {
        triggerRef.current.measure((x, y, width, height, pageX, pageY) => {
          setTriggerLayout({ x: pageX, y: pageY, width, height });
        });
        opacity.value = withTiming(1, { duration: 200 });
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      } else {
        opacity.value = withTiming(0, { duration: 150 });
        scale.value = withTiming(0.95, { duration: 150 });
      }
    }, [open]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    const handleLayout = (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setLayout({ width, height });
    };

    const getPosition = (): ViewStyle => {
      if (!triggerLayout || !layout) return {};

      let top = 0;
      let left = 0;

      switch (side) {
        case "top":
          top = triggerLayout.y - layout.height - sideOffset;
          left = triggerLayout.x + triggerLayout.width / 2 - layout.width / 2;
          break;
        case "bottom":
          top = triggerLayout.y + triggerLayout.height + sideOffset;
          left = triggerLayout.x + triggerLayout.width / 2 - layout.width / 2;
          break;
        case "left":
          top = triggerLayout.y + triggerLayout.height / 2 - layout.height / 2;
          left = triggerLayout.x - layout.width - sideOffset;
          break;
        case "right":
          top = triggerLayout.y + triggerLayout.height / 2 - layout.height / 2;
          left = triggerLayout.x + triggerLayout.width + sideOffset;
          break;
      }

      return { position: "absolute", top, left };
    };

    if (!open) return null;

    return (
      <Modal transparent visible={open} animationType="none">
        <Animated.View
          ref={ref as any}
          onLayout={handleLayout}
          style={[
            styles.tooltip,
            getPosition(),
            animatedStyle,
            style,
          ]}
          className={cn(
            "rounded-md border border-border bg-popover px-3 py-1.5 shadow-lg",
            className
          )}
        >
          {typeof children === "string" ? (
            <Text
              className="text-sm text-popover-foreground"
              style={textStyle}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </Animated.View>
      </Modal>
    );
  }
);

TooltipContent.displayName = "TooltipContent";

const styles = StyleSheet.create({
  tooltip: {
    zIndex: 9999,
  },
});

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
