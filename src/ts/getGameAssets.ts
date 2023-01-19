import { themes } from "../../public/themes";
import { SpriteSet, ThemeConfig } from "./types";

export const getGameAssets = (): string[] => {
  const assets: string[] = [];

  Object.keys(themes).forEach((theme) => {
    const themeConfig = themes[theme] as ThemeConfig;

    // add player sprites
    ["p1", "p2"].forEach((player, pi) => {
      ["default", "move", "attack", "block"].forEach((action) => {
        const spriteSet = themeConfig.players[pi][action] as SpriteSet;

        ["n", "ne", "e", "se", "s", "sw", "w", "nw"].forEach((direction) => {
          const images = spriteSet[direction].images as string[];
          const paths = images.map((image) => `/themes/${theme}/${image}`);
          assets.push(...paths);
        });
      });
    });

    // add background sprite
    themeConfig.scene.images.forEach((image) => {
      assets.push(`/themes/${theme}/${image}`);
    });

    // add sounds
    ["bgAudio", "attackAudio", "blockAudio", "collideAudio", "winAudio"].forEach((audio) => {
      assets.push(`/themes/${theme}/${themeConfig[audio]}`);
    });
  });

  return [...new Set(assets)];
};
