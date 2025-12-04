原生 expo-image 封装
```tsx
import React, { forwardRef, useMemo } from 'react'
import { Image as ExpoImage, ImageProps as ExpoImageProps } from 'expo-image'
import { TouchableOpacity, TouchableOpacityProps } from 'react-native'

interface ImgProps extends ExpoImageProps {
  onClick?: () => void
  touchProps?: TouchableOpacityProps
  className?: string
  src?: string | number
  errorSource?: string | number
}

const Img = forwardRef<ExpoImage, ImgProps>((props, ref) => {
  const {
    onClick,
    touchProps = {},
    className = '',
    style,
    src,
    errorSource,
    source: propSource,
    ...reset
  } = props

  // 判断是否为网络图片
  const isNetworkImage = (uri: string | number): boolean => {
    if (typeof uri === 'number') return false
    return uri.startsWith('http://') || uri.startsWith('https://')
  }

  // 构建图片源
  const imageSource = useMemo(() => {
    // 如果提供了source属性，优先使用
    if (propSource) return propSource

    if (!src) return undefined

    if (typeof src === 'number') {
      // 本地图片资源（require导入的资源ID）
      return src
    } else {
      // 网络图片或本地文件路径
      if (isNetworkImage(src)) {
        return {
          uri: src,
          cache: 'immutable', // 使用expo-image的缓存机制
        }
      } else {
        // 本地文件路径
        return { uri: src }
      }
    }
  }, [src, propSource])

  const imgProps = {
    style,
    className,
    ref,
    source: imageSource,
    errorSource,
    ...reset,
  }

  const handlePress = () => {
    onClick && onClick()
  }

  if (onClick) {
    return (
      <TouchableOpacity onPress={handlePress} {...touchProps}>
        <ExpoImage {...imgProps} />
      </TouchableOpacity>
    )
  }

  return <ExpoImage {...imgProps} />
})

Img.displayName = 'Img'
export default Img

```