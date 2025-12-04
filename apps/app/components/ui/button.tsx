import * as React from "react";
import { Pressable, Text, ActivityIndicator, type PressableProps, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-md active:opacity-70",
  {
    variants: {
      variant: {
        default: "bg-primary",
        destructive: "bg-destructive",
        outline: "border border-input bg-background",
        secondary: "bg-secondary",
        ghost: "active:bg-accent",
        link: "",
        gradient: "",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva("text-sm font-medium text-center", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      destructive: "text-destructive-foreground",
      outline: "text-foreground",
      secondary: "text-secondary-foreground",
      ghost: "text-foreground",
      link: "text-primary",
      gradient: "text-white",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface ButtonProps
  extends Omit<PressableProps, "style">,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  style?: ViewStyle;
  loading?: boolean;
  onClick?: () => void;
}

const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(({ className, variant, size, children, disabled, loading, style, onClick, onPress, ...props }, ref) => {
  const isGradient = variant === "gradient";
  const isDisabled = disabled || loading;

  const content = loading ? (
    <ActivityIndicator size="small" color={variant === "outline" || variant === "ghost" ? "#666" : "#fff"} />
  ) : typeof children === "string" ? (
    <Text className={cn(buttonTextVariants({ variant }))}>{children}</Text>
  ) : (
    children
  );

  return (
    <Pressable
      ref={ref}
      className={cn(
        buttonVariants({ variant, size }),
        isDisabled && "opacity-50",
        isGradient && "overflow-hidden",
        className
      )}
      disabled={isDisabled}
      style={style}
      onPress={onClick || onPress}
      {...props}
    >
      {isGradient ? (
        <LinearGradient
          colors={["#9966FF", "#FF6699", "#FF9966"]}
          locations={[0.0015, 0.4985, 0.9956]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={{
            flex: 1,
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
