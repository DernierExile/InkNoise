import { ColorPalette } from '../types';
import { rgbToOklab, oklabDistance } from './oklab';

export const PREDEFINED_PALETTES: ColorPalette[] = [
  {
    name: 'Monochrome',
    colors: ['#000000', '#FFFFFF']
  },
  {
    name: 'Grayscale 4',
    colors: ['#000000', '#555555', '#AAAAAA', '#FFFFFF']
  },
  {
    name: 'Grayscale 8',
    colors: ['#000000', '#242424', '#484848', '#6D6D6D', '#929292', '#B6B6B6', '#DBDBDB', '#FFFFFF']
  },
  {
    name: 'Gameboy',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f']
  },
  {
    name: 'CGA',
    colors: ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA', '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF']
  },
  {
    name: 'Commodore 64',
    colors: ['#000000', '#FFFFFF', '#880000', '#AAFFEE', '#CC44CC', '#00CC55', '#0000AA', '#EEEE77', '#DD8855', '#664400', '#FF7777', '#333333', '#777777', '#AAFF66', '#0088FF', '#BBBBBB']
  },
  {
    name: 'Apple II',
    colors: ['#000000', '#6C2940', '#403578', '#D93CF0', '#135740', '#808080', '#2697F5', '#BFB4F4', '#404B07', '#D9680F', '#808080', '#F5BFAE', '#1B9E07', '#BFD35A', '#6FCF57', '#FFFFFF']
  },
  {
    name: 'Pico-8',
    colors: ['#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA']
  },
  {
    name: 'NES',
    colors: ['#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400', '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#000000', '#000000', '#BCBCBC', '#0078F8', '#0058F8', '#6844FC', '#D800CC', '#E40058', '#F83800', '#E45C10', '#AC7C00', '#00B800', '#00A800', '#00A844', '#008888', '#000000', '#000000', '#000000', '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8', '#F878F8', '#F85898', '#F87858', '#FCA044', '#F8B800', '#B8F818', '#58D854', '#58F898', '#00E8D8', '#787878', '#000000', '#000000', '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8', '#F8B8F8', '#F8A4C0', '#F0D0B0', '#FCE0A8', '#F8D878', '#D8F878', '#B8F8B8', '#B8F8D8', '#00FCFC', '#F8D8F8', '#000000', '#000000']
  },
  {
    name: 'Cyberpunk',
    colors: ['#000000', '#FF00FF', '#00FFFF', '#FF0080', '#8000FF', '#FFFFFF']
  },
  {
    name: 'Pastel',
    colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4', '#FFDFD3']
  },
  {
    name: 'Neon',
    colors: ['#000000', '#FF1744', '#FF3D00', '#FF9100', '#FFEA00', '#00E676', '#00E5FF', '#651FFF', '#F50057']
  },
  {
    name: 'Sepia',
    colors: ['#704214', '#8B5A2B', '#A0826D', '#C4A484', '#E6D5B8', '#F5DEB3']
  },
  {
    name: 'Ocean',
    colors: ['#003049', '#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF', '#ADE8F4', '#CAF0F8']
  },
  {
    name: 'Game Boy Pocket',
    colors: ['#2B2B2B', '#525252', '#989898', '#C4C4C4']
  },
  {
    name: 'ZX Spectrum',
    colors: ['#000000', '#0000D7', '#D70000', '#D700D7', '#00D700', '#00D7D7', '#D7D700', '#D7D7D7', '#000000', '#0000FF', '#FF0000', '#FF00FF', '#00FF00', '#00FFFF', '#FFFF00', '#FFFFFF']
  },
  {
    name: 'Amstrad CPC',
    colors: ['#000000', '#000080', '#0000FF', '#800000', '#800080', '#8000FF', '#FF0000', '#FF0080', '#FF00FF', '#008000', '#008080', '#0080FF', '#808000', '#808080', '#8080FF', '#FF8000', '#FF8080', '#FF80FF', '#00FF00', '#00FF80', '#00FFFF', '#80FF00', '#80FF80', '#80FFFF', '#FFFF00', '#FFFF80', '#FFFFFF']
  },
  {
    name: 'Atari 2600',
    colors: ['#000000', '#404040', '#6C6C6C', '#909090', '#B0B0B0', '#C8C8C8', '#DCDCDC', '#ECECEC']
  },
  {
    name: 'MSX',
    colors: ['#000000', '#000000', '#3EB849', '#74D07D', '#5955E0', '#8076F1', '#B95E51', '#65DBEF', '#DB6559', '#FF897D', '#CCC35E', '#DED087', '#3AA241', '#B766B5', '#CCCCCC', '#FFFFFF']
  },
  {
    name: 'Vaporwave',
    colors: ['#FF71CE', '#01CDFE', '#05FFA1', '#B967FF', '#FFFB96', '#FF6AD5', '#C774E8', '#94D0FF']
  },
  {
    name: 'Retrowave',
    colors: ['#2B0F54', '#AB1571', '#FB0473', '#FF5F8F', '#FFA62B', '#FFD35A', '#FE4365', '#83AF9B']
  },
  {
    name: 'Teletext',
    colors: ['#000000', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFFFF']
  },
  {
    name: 'CGA Mode 4',
    colors: ['#000000', '#00AAAA', '#AA00AA', '#AAAAAA']
  },
  {
    name: 'EGA',
    colors: ['#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA', '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF']
  },
  {
    name: 'Macintosh II',
    colors: ['#FFFFFF', '#FBFF00', '#FF6403', '#DD0907', '#F20884', '#4700A5', '#0000D3', '#02ABEA', '#1FB714', '#006412', '#562C05', '#90713A', '#C0C0C0', '#808080', '#404040', '#000000']
  },
  {
    name: 'Virtual Boy',
    colors: ['#000000', '#550000', '#AA0000', '#FF0000']
  },
  {
    name: 'Outrun',
    colors: ['#2C1E3D', '#F73859', '#FE7BAC', '#FEBF63', '#FFF484', '#73B9A2', '#4ECDC4']
  },
  {
    name: 'Grayscale 16',
    colors: ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555', '#666666', '#777777', '#888888', '#999999', '#AAAAAA', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#EEEEEE', '#FFFFFF']
  },
  {
    name: 'Ink & Paper',
    colors: ['#0F0F0F', '#1A1A1A', '#2E2E2E', '#F5F5DC']
  },
  {
    name: 'Marathon Classic',
    colors: ['#000000', '#c2fe0b', '#01ffff', '#ff0d1a', '#29324f', '#59b41d']
  },
  {
    name: 'Marathon Acid',
    colors: ['#000000', '#c2fe0c', '#ffffff', '#5200ff', '#8e8e8e']
  },
  {
    name: 'Marathon Neon',
    colors: ['#000000', '#c0fc04', '#ea027e', '#3601fb', '#ff5500']
  },
  {
    name: 'Marathon Cyber',
    colors: ['#000000', '#c3fc0d', '#63ede0', '#470bf6', '#f81d78', '#fd6c1d']
  },
  {
    name: 'Marathon Yellow',
    colors: ['#000000', '#1a1a1a', '#c2fe0b', '#ffffff']
  },
  {
    name: 'Marathon Cyan',
    colors: ['#000000', '#1a1a1a', '#01ffff', '#63ede0', '#ffffff']
  },
  {
    name: 'Marathon Pink',
    colors: ['#000000', '#1a1a1a', '#ea027e', '#f81d78', '#ffffff']
  },
  {
    name: 'Marathon Purple',
    colors: ['#000000', '#1a1a1a', '#5200ff', '#470bf6', '#ffffff']
  },
  {
    name: 'Marathon Orange',
    colors: ['#000000', '#1a1a1a', '#ff5500', '#fd6c1d', '#ffffff']
  },
  {
    name: 'Marathon Red',
    colors: ['#000000', '#1a1a1a', '#ff0d1a', '#ea027e', '#ffffff']
  }
];

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function findClosestColor(r: number, g: number, b: number, palette: string[]): [number, number, number] {
  const target = rgbToOklab(r, g, b);
  let minDist = Infinity;
  let closest: [number, number, number] = [0, 0, 0];

  for (const color of palette) {
    const [pr, pg, pb] = hexToRgb(color);
    const lab = rgbToOklab(pr, pg, pb);
    const dist = oklabDistance(target, lab);
    if (dist < minDist) {
      minDist = dist;
      closest = [pr, pg, pb];
    }
  }
  return closest;
}

export function extractPaletteFromImage(imageData: ImageData, maxColors: number): string[] {
  const colorMap = new Map<string, number>();

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = Math.round(imageData.data[i] / 8) * 8;
    const g = Math.round(imageData.data[i + 1] / 8) * 8;
    const b = Math.round(imageData.data[i + 2] / 8) * 8;
    const key = `${r},${g},${b}`;
    colorMap.set(key, (colorMap.get(key) || 0) + 1);
  }

  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return rgbToHex(r, g, b);
    });

  return sortedColors;
}
