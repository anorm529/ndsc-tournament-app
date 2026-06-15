export const ndscColours = {
  navy: "#0b1222",
  navyDeep: "#070b1b",
  navySoft: "#13243a",
  mint: "#55d6c6",
  mintDark: "#2bb8ab",
  page: "#f8fafc",
  warmPage: "#f7f7f2",
};

export function ndscHeroGradient() {
  return `linear-gradient(135deg, ${ndscColours.navy}, ${ndscColours.navySoft})`;
}
