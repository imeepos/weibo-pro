import type { TColor } from './types';

type ColorDef = readonly [name: string, value: string, isBrightColor: boolean];

const DEFAULT_COLORS_DEFS: readonly ColorDef[] = [
  ['black', '#000000', false],
  ['dark grey 4', '#434343', false],
  ['dark grey 3', '#666666', false],
  ['dark grey 2', '#999999', false],
  ['dark grey 1', '#B7B7B7', false],
  ['grey', '#CCCCCC', false],
  ['light grey 1', '#D9D9D9', false],
  ['light grey 2', '#EFEFEF', true],
  ['light grey 3', '#F3F3F3', true],
  ['white', '#FFFFFF', true],

  ['red berry', '#980100', false],
  ['red', '#FE0000', false],
  ['orange', '#FE9900', false],
  ['yellow', '#FEFF00', true],
  ['green', '#00FF00', false],
  ['cyan', '#00FFFF', false],
  ['cornflower blue', '#4B85E8', false],
  ['blue', '#1300FF', false],
  ['purple', '#9900FF', false],
  ['magenta', '#FF00FF', false],

  ['light red berry 3', '#E6B8AF', false],
  ['light red 3', '#F4CCCC', false],
  ['light orange 3', '#FCE4CD', true],
  ['light yellow 3', '#FFF2CC', true],
  ['light green 3', '#D9EAD3', true],
  ['light cyan 3', '#D0DFE3', false],
  ['light cornflower blue 3', '#C9DAF8', false],
  ['light blue 3', '#CFE1F3', true],
  ['light purple 3', '#D9D2E9', true],
  ['light magenta 3', '#EAD1DB', true],

  ['light red berry 2', '#DC7E6B', false],
  ['light red 2', '#EA9999', false],
  ['light orange 2', '#F9CB9C', false],
  ['light yellow 2', '#FFE598', true],
  ['light green 2', '#B7D6A8', false],
  ['light cyan 2', '#A1C4C9', false],
  ['light cornflower blue 2', '#A4C2F4', false],
  ['light blue 2', '#9FC5E8', false],
  ['light purple 2', '#B5A7D5', false],
  ['light magenta 2', '#D5A6BD', false],

  ['light red berry 1', '#CC4125', false],
  ['light red 1', '#E06666', false],
  ['light orange 1', '#F6B26B', false],
  ['light yellow 1', '#FFD966', false],
  ['light green 1', '#93C47D', false],
  ['light cyan 1', '#76A5AE', false],
  ['light cornflower blue 1', '#6C9EEB', false],
  ['light blue 1', '#6FA8DC', false],
  ['light purple 1', '#8D7CC3', false],
  ['light magenta 1', '#C27BA0', false],

  ['dark red berry 1', '#A61B00', false],
  ['dark red 1', '#CC0000', false],
  ['dark orange 1', '#E59138', false],
  ['dark yellow 1', '#F1C231', false],
  ['dark green 1', '#6AA74F', false],
  ['dark cyan 1', '#45818E', false],
  ['dark cornflower blue 1', '#3B78D8', false],
  ['dark blue 1', '#3E84C6', false],
  ['dark purple 1', '#664EA6', false],
  ['dark magenta 1', '#A64D78', false],

  ['dark red berry 2', '#84200D', false],
  ['dark red 2', '#990001', false],
  ['dark orange 2', '#B45F05', false],
  ['dark yellow 2', '#BF9002', false],
  ['dark green 2', '#38761D', false],
  ['dark cyan 2', '#124F5C', false],
  ['dark cornflower blue 2', '#1155CB', false],
  ['dark blue 2', '#0C5394', false],
  ['dark purple 2', '#351C75', false],
  ['dark magenta 2', '#741B47', false],

  ['dark red berry 3', '#5B0F00', false],
  ['dark red 3', '#660000', false],
  ['dark orange 3', '#783F04', false],
  ['dark yellow 3', '#7E6000', false],
  ['dark green 3', '#274E12', false],
  ['dark cyan 3', '#0D343D', false],
  ['dark cornflower blue 3', '#1B4487', false],
  ['dark blue 3', '#083763', false],
  ['dark purple 3', '#1F124D', false],
  ['dark magenta 3', '#4C1130', false],
];

const DEFAULT_CUSTOM_COLORS_DEFS: readonly ColorDef[] = [
  ['dark orange 3', '#783F04', false],
  ['dark grey 3', '#666666', false],
  ['dark grey 2', '#999999', false],
  ['light cornflower blue 1', '#6C9EEB', false],
  ['dark magenta 3', '#4C1130', false],
];

const toColors = (defs: readonly ColorDef[]): TColor[] =>
  defs.map(([name, value, isBrightColor]) => ({
    isBrightColor,
    name,
    value,
  }));

export const DEFAULT_COLORS: TColor[] = toColors(DEFAULT_COLORS_DEFS);

export const DEFAULT_CUSTOM_COLORS: TColor[] = toColors(
  DEFAULT_CUSTOM_COLORS_DEFS
);
