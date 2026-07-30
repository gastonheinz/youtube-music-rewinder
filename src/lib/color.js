/** Utilidades de color para derivar la rampa secuencial del color de acento. */

function hexToHsl(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  switch (max) {
    case r:
      h = ((g - b) / d) % 6;
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  const toHex = (value) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// En oscuro mas reproducciones es mas claro; en claro es al reves.
const DARK_LIGHTNESS_STEPS = [30, 38, 46, 55, 64, 74];
const LIGHT_LIGHTNESS_STEPS = [74, 64, 55, 46, 38, 28];

/** Rampa de 6 pasos (--seq-1..--seq-6) derivada del color de acento del usuario. */
export function buildSequentialRamp(accentHex, isDark) {
  const hsl = hexToHsl(accentHex);
  if (!hsl) return null;
  const saturation = Math.min(80, Math.max(40, hsl.s));
  const steps = isDark ? DARK_LIGHTNESS_STEPS : LIGHT_LIGHTNESS_STEPS;
  return steps.map((l) => hslToHex(hsl.h, saturation, l));
}
