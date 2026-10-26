const pairs = [
  { name: 'dark text on the purple accent', foreground: '#15141b', background: '#a277ff' },
  { name: 'normal text on the dark surface', foreground: '#edecee', background: '#15141b' },
];

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

for (const pair of pairs) {
  const ratio = contrast(pair.foreground, pair.background);
  if (ratio < 4.5) throw new Error(`${pair.name} is ${ratio.toFixed(2)}:1, below AA`);
  console.log(`${pair.name}: ${ratio.toFixed(2)}:1`);
}
