import NextImage, { type ImageProps } from "next/image";
import { withBasePath } from "@/constants/basePath";

/**
 * next/image with the app's base path applied to local sources.
 *
 * Next prefixes the image *optimizer route* with basePath but not the `src`
 * it is pointed at, and for `unoptimized` images it does not touch the src
 * either — so a `/assets/…` file served from `/app-v2/assets/…` 404s both
 * ways round (the optimizer answers 400 "not a valid image" because the file
 * it fetched at the origin root does not exist).
 *
 * Prefixing the src itself fixes both paths at once, so every image in the app
 * goes through here. withBasePath only touches root-relative paths, leaving
 * `blob:`, `data:` and absolute CDN URLs exactly as they were.
 */
export function AppImage({ src, ...props }: ImageProps) {
  return <NextImage src={typeof src === "string" ? withBasePath(src) : src} {...props} />;
}
