import { useCssElement } from "react-native-css";

import Animated from "react-native-reanimated";
import { View as RNView, Pressable, type PressableProps } from "react-native";

const AnimatedView = Animated.createAnimatedComponent(RNView);

type ViewProps = React.ComponentProps<typeof AnimatedView> & {
    className?: string;
    onClick?: () => void;
    onPress?: () => void;
    pressableProps?: Omit<PressableProps, 'onPress' | 'children'>;
};

function CSSView({ onClick, onPress, pressableProps, children, ...props }: Omit<ViewProps, 'className'>) {
    const handlePress = onClick || onPress;

    if (handlePress) {
        return (
            <Pressable onPress={handlePress} {...pressableProps}>
                <AnimatedView {...props}>{children}</AnimatedView>
            </Pressable>
        );
    }

    return <AnimatedView {...props}>{children}</AnimatedView>;
}

export const View = (props: ViewProps) => {
    return useCssElement(CSSView, props, { className: "style" });
};

export type { ViewProps };
View.displayName = "View";
