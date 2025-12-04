import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

export const PointsIcon = ({ className }: { className?: string }) => (
  <Svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <Path
      d="M11.0325 7.02295H8.98497C8.80047 7.02295 8.65947 6.85645 8.68947 6.67495L9.41847 2.20945C9.46647 1.91695 9.10497 1.73995 8.90247 1.95595L3.74847 7.47146C3.56997 7.66346 3.70497 7.97695 3.96747 7.97695H6.01497C6.19947 7.97695 6.34047 8.14346 6.31047 8.32495L5.58147 12.7905C5.53347 13.083 5.89497 13.26 6.09747 13.044L11.2515 7.52846C11.4315 7.33645 11.295 7.02295 11.0325 7.02295Z"
      fill="url(#paint0_linear_5062_1981)"
    />
    <Defs>
      <LinearGradient id="paint0_linear_5062_1981" x1="7.50031" y1="1.86011" x2="7.50031" y2="13.1398" gradientUnits="userSpaceOnUse">
        <Stop stopColor="#FFC738" />
        <Stop offset="1" stopColor="#FFA92D" />
      </LinearGradient>
    </Defs>
  </Svg>
);