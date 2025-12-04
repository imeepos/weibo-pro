import Svg, { Path, type SvgProps } from 'react-native-svg';
import { useCssElement } from 'react-native-css';

type IconProps = SvgProps & { className?: string };

const BaseSvg = (props: SvgProps) => (
  <Svg width="56" height="56" viewBox="0 0 56 56" fill="none" {...props}>
    <Path d="M0 56.0001H56V7.77245e-05H0V56.0001Z" fill="white" />
  </Svg>
);

export const NoNewsIcon = (props: IconProps) => useCssElement(BaseSvg, props, { className: 'style' });
