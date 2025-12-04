import * as React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

import { cn } from "../../lib/utils";
import { Button, buttonVariants } from "./button";

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(
  null
);

const useAlertDialogContext = () => {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error(
      "AlertDialog components must be used within AlertDialog provider"
    );
  }
  return context;
};

interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function AlertDialog({ children, open, onOpenChange }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleSetOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setInternalOpen(value);
      }
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  const value: AlertDialogContextValue = {
    open: isOpen,
    setOpen: handleSetOpen,
  };

  return (
    <AlertDialogContext.Provider value={value}>
      {children}
    </AlertDialogContext.Provider>
  );
}

interface AlertDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  style?: ViewStyle;
}

function AlertDialogTrigger({
  children,
  asChild,
  style,
}: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onPress: () => setOpen(true),
    });
  }

  return (
    <Pressable onPress={() => setOpen(true)} style={style}>
      {children}
    </Pressable>
  );
}

interface AlertDialogPortalProps {
  children: React.ReactNode;
}

function AlertDialogPortal({ children }: AlertDialogPortalProps) {
  return <>{children}</>;
}

interface AlertDialogOverlayProps {
  className?: string;
  style?: ViewStyle;
}

function AlertDialogOverlay({ className, style }: AlertDialogOverlayProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      className={cn("absolute inset-0", className)}
      style={[styles.overlay, style]}
    >
      <BlurView
        intensity={20}
        tint="default"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#00000080" },
        ]}
      />
    </Animated.View>
  );
}

interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

function AlertDialogContent({
  children,
  className,
  style,
}: AlertDialogContentProps) {
  const { open, setOpen } = useAlertDialogContext();

  React.useEffect(() => {
    if (Platform.OS === "android") {
      if (open) {
        StatusBar.setBackgroundColor("rgba(0,0,0,0.5)", true);
      } else {
        StatusBar.setBackgroundColor("transparent", true);
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <Modal
      transparent
      visible={open}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => setOpen(false)}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <AlertDialogOverlay />
        </Pressable>

        <Animated.View
          entering={ZoomIn.duration(200).springify().damping(15)}
          exiting={ZoomOut.duration(150)}
          className={cn(
            "bg-background w-[90%] max-w-[500px] rounded-lg border border-border p-6 shadow-2xl gap-4",
            className
          )}
          style={[styles.content, style]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface AlertDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

function AlertDialogHeader({
  children,
  className,
  style,
}: AlertDialogHeaderProps) {
  return (
    <View
      className={cn("flex-col gap-2", className)}
      style={style}
    >
      {children}
    </View>
  );
}

interface AlertDialogFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

function AlertDialogFooter({
  children,
  className,
  style,
}: AlertDialogFooterProps) {
  return (
    <View
      className={cn("flex flex-row gap-2 justify-end", className)}
      style={style}
    >
      {children}
    </View>
  );
}

interface AlertDialogTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle;
}

function AlertDialogTitle({
  children,
  className,
  style,
}: AlertDialogTitleProps) {
  return (
    <Text
      className={cn("text-lg font-semibold text-foreground", className)}
      style={style}
    >
      {children}
    </Text>
  );
}

interface AlertDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
  style?: TextStyle;
}

function AlertDialogDescription({
  children,
  className,
  style,
}: AlertDialogDescriptionProps) {
  return (
    <Text
      className={cn("text-sm text-muted-foreground", className)}
      style={style}
    >
      {children}
    </Text>
  );
}

interface AlertDialogActionProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

function AlertDialogAction({
  children,
  className,
  onPress,
  style,
}: AlertDialogActionProps) {
  const { setOpen } = useAlertDialogContext();

  const handlePress = () => {
    onPress?.();
    setOpen(false);
  };

  return (
    <Button
      onPress={handlePress}
      className={cn("flex-1", className)}
      style={style}
    >
      {children}
    </Button>
  );
}

interface AlertDialogCancelProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

function AlertDialogCancel({
  children,
  className,
  onPress,
  style,
}: AlertDialogCancelProps) {
  const { setOpen } = useAlertDialogContext();

  const handlePress = () => {
    onPress?.();
    setOpen(false);
  };

  return (
    <Button
      variant="outline"
      onPress={handlePress}
      className={cn("flex-1", className)}
      style={style}
    >
      {children}
    </Button>
  );
}

interface DeleteAlertDialogActionProps {
  onPress?: () => void;
  style?: ViewStyle;
  className?: string;
}

function DeleteAlertDialogAction({
  onPress,
  style,
  className,
}: DeleteAlertDialogActionProps) {
  return (
    <AlertDialogAction
      onPress={onPress}
      className={className}
      style={{ ...styles.deleteActionButton, ...style }}
    >
      <Text style={styles.deleteActionText}>确认删除</Text>
    </AlertDialogAction>
  );
}

function CancelAlertDialogAction({
  onPress,
  style,
  className,
}: DeleteAlertDialogActionProps) {
  return (
    <AlertDialogAction
      onPress={onPress}
      className={className}
      style={{ ...styles.cancelActionButton, ...style }}
    >
      <Text style={styles.cancelActionText}>取消</Text>
    </AlertDialogAction>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    zIndex: 1,
  },
  content: {
    zIndex: 2,
  },
  deleteActionButton: {
    backgroundColor: "#FA3F2C",
    alignItems: 'center'
  },
  deleteActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelActionButton: {
    backgroundColor: '#262A31',
    alignItems: 'center'
  },
  cancelActionText: {
    color: "#CCCCCC",
    fontSize: 14,
  }
});

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  DeleteAlertDialogAction,
  CancelAlertDialogAction
};
