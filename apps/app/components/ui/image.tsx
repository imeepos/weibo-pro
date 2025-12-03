import {
    useCssElement
} from "react-native-css";
import Animated from "react-native-reanimated";
import { Image as RNImage, type ImageContentFit, type ImageContentPosition } from "expo-image";
import { StyleSheet } from "react-native";

const AnimatedExpoImage = Animated.createAnimatedComponent(RNImage);
export type ImageProps = React.ComponentProps<typeof AnimatedExpoImage>;

// CSS 扩展的样式属性
type CSSImageStyle = {
    objectFit?: string;
    objectPosition?: string;
    [key: string]: any;
};

function CSSImage(props: React.ComponentProps<typeof AnimatedExpoImage>) {
    const flattenedStyle = StyleSheet.flatten(props.style) as CSSImageStyle || {};
    const { objectFit, objectPosition, ...style } = flattenedStyle;

    return (
        <AnimatedExpoImage
            contentFit={objectFit as ImageContentFit}
            contentPosition={objectPosition as ImageContentPosition}
            {...props}
            source={
                typeof props.source === "string" ? { uri: props.source } : props.source
            }
            style={style}
        />
    );
}

export const Image = (
    props: React.ComponentProps<typeof CSSImage> & {
        className?: string;
    }
) => {
    return useCssElement(CSSImage, props, {
        className: "style",
    });
};

Image.displayName = "CSS(Image)";
