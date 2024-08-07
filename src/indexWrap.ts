import PostCSSPrefixWrap, {
  PLUGIN_NAME,
  PostCSSPrefixWrapOptions,
} from "./PostCSSPrefixWrap";
import {
  PostCSS7Plugin,
  PostCSS7PostCSS,
  PostCSS8Plugin,
  PostCSS8PostCSS,
  PostCSSAcceptedPlugin,
  PostCSSContainer,
} from "Types";

const isPostCSSv8 = (postcss: PostCSS7PostCSS | PostCSS8PostCSS) =>
  (postcss as PostCSS8PostCSS).Root !== undefined;

export = (
  postcss: PostCSS7PostCSS | PostCSS8PostCSS
): PostCSS7Plugin | PostCSS8Plugin => {
  if (isPostCSSv8(postcss)) {
    const plugin = (
      ...reqs: (string | PostCSSPrefixWrapOptions)[]
    ): PostCSSAcceptedPlugin => {
      let options: PostCSSPrefixWrapOptions = {};

      if (reqs.length === 1) {
        if (typeof reqs[0] === "string") {
          options.prefixSelector = reqs[0];
        } else {
          options = reqs[0] as PostCSSPrefixWrapOptions;
        }
      } else {
        options = {
          prefixSelector: reqs[0] as string,
          ...((reqs[1] ?? {}) as PostCSSPrefixWrapOptions),
        };
      }
      const postCSSPrefixWrap = new PostCSSPrefixWrap(
        options.prefixSelector!,
        options
      );
      return {
        postcssPlugin: PLUGIN_NAME,
        Once(root: PostCSSContainer): void {
          postCSSPrefixWrap.prefixRoot(root);
        },
      };
    };
    plugin.postcss = true;
    return plugin;
  } else {
    return (postcss as PostCSS7PostCSS).plugin(
      PLUGIN_NAME,
      (prefixSelector: string, options?: PostCSSPrefixWrapOptions) => {
        return new PostCSSPrefixWrap(prefixSelector, options).prefix();
      }
    );
  }
};
