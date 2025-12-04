import { useMemo } from "react";
import { useCssElement } from "react-native-css";
import Animated from "react-native-reanimated";
import { Image as RNImage, type ImageContentFit, type ImageContentPosition, type ImageSource } from "expo-image";
import { StyleSheet, TouchableOpacity, type TouchableOpacityProps } from "react-native";

const AnimatedExpoImage = Animated.createAnimatedComponent(RNImage);

type CSSImageStyle = {
    objectFit?: string;
    objectPosition?: string;
    [key: string]: any;
};

type ImageProps = React.ComponentProps<typeof AnimatedExpoImage> & {
    className?: string;
    src?: string | number;
    onClick?: () => void;
    touchProps?: TouchableOpacityProps;
    errorSource?: ImageSource;
};

function CSSImage({ src, source: propSource, onClick, touchProps, errorSource, ...props }: Omit<ImageProps, 'className'>) {
    const flattenedStyle = StyleSheet.flatten(props.style) as CSSImageStyle || {};
    const { objectFit, objectPosition, ...style } = flattenedStyle;

    const source = useMemo(() => {
        if (propSource) return typeof propSource === "string" ? { uri: propSource } : propSource;
        if (!src) return undefined;
        if (typeof src === "number") return src;
        const isNetwork = src.startsWith("http://") || src.startsWith("https://");
        return isNetwork ? { uri: src, cachePolicy: "disk" as const } : { uri: src };
    }, [src, propSource]);

    const imageElement = (
        <AnimatedExpoImage
            contentFit={objectFit as ImageContentFit}
            contentPosition={objectPosition as ImageContentPosition}
            {...props}
            source={source}
            placeholder={errorSource}
            style={style}
        />
    );

    if (onClick) {
        return (
            <TouchableOpacity onPress={onClick} {...touchProps}>
                {imageElement}
            </TouchableOpacity>
        );
    }

    return imageElement;
}

export const Image = (props: ImageProps) => {
    return useCssElement(CSSImage, props, { className: "style" });
};

export type { ImageProps };
Image.displayName = "Image";
