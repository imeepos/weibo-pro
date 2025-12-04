import Svg, { Path, G, Defs, ClipPath, Rect } from 'react-native-svg';

export const TopArrowIcon = () => (
  <Svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <G clipPath="url(#clip0_5062_901)">
      <Path d="M4.50684 2.4707C4.64648 2.33105 4.83594 2.20215 5.01465 2.24121C5.19434 2.21094 5.36328 2.35059 5.50293 2.4707L9.81641 6.80371C10.0352 7.02246 10.0352 7.38184 9.81641 7.60059C9.59766 7.81934 9.23828 7.81934 9.01953 7.60059L5.00488 3.47656L0.980469 7.60059C0.761719 7.81934 0.402344 7.81934 0.183594 7.60059C-0.0351562 7.38184 -0.0351562 7.02246 0.183594 6.80371L4.50684 2.4707Z" fill="#F5F5F5" stroke="#F5F5F5" strokeWidth="0.5" />
    </G>
    <Defs>
      <ClipPath id="clip0_5062_901">
        <Rect width="10" height="10" fill="white" x="10" y="10" scaleX={-1} scaleY={-1} />
      </ClipPath>
    </Defs>
  </Svg>
);
