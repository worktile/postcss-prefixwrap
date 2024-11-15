import Selector from "./Selector";
import { PostCSSContainer, PostCSSRule } from "Types";

export const PLUGIN_NAME = "postcss-prefixwrap";

export interface PostCSSPrefixWrapOptions {
  prefixSelector?: string;
  ignoredSelectors?: (string | RegExp)[];
  prefixRootTags?: boolean;
  whitelist?: Array<string>;
  blacklist?: Array<string>;
  hasAttribute?: string;
}

export default class PostCSSPrefixWrap {
  private readonly blacklist: Array<string>;
  private readonly ignoredSelectors: (string | RegExp)[];
  private readonly isPrefixSelector: RegExp;
  private readonly prefixRootTags: boolean;
  private readonly prefixSelector: string;
  private readonly whitelist: Array<string>;
  private readonly hasAttribute: string;

  constructor(prefixSelector: string, options: PostCSSPrefixWrapOptions = {}) {
    this.blacklist = options.blacklist ?? [];
    this.ignoredSelectors = options.ignoredSelectors ?? [];
    // eslint-disable-next-line security-node/non-literal-reg-expr
    this.isPrefixSelector = new RegExp(`^s*${prefixSelector}(\s|,)*$`); // eslint-disable-line
    this.prefixRootTags = options.prefixRootTags ?? false;
    this.prefixSelector = prefixSelector;
    this.whitelist = options.whitelist ?? [];
    this.hasAttribute = options.hasAttribute || "";
  }

  prefixWrapCSSSelector(
    cssSelector: string,
    cssRule: PostCSSRule
  ): string | null {
    const cleanSelector = Selector.clean(cssSelector);

    if (cleanSelector === "") {
      return null;
    }

    // Do not prefix keyframes rules.
    if (Selector.isKeyframes(cssRule)) {
      return cleanSelector;
    }

    // Do not prefix media rules.
    if (Selector.isMediaPrint(cssRule)) {
      return cleanSelector;
    }

    // Check for matching ignored selectors
    if (
      this.ignoredSelectors.some((currentValue) =>
        cleanSelector.match(currentValue)
      )
    ) {
      return cleanSelector;
    }

    // Anything other than a root tag is always prefixed.
    if (Selector.isNotRootTag(cleanSelector)) {
      let css = `${this.prefixSelector} ${cleanSelector}`;
      if (Selector.isClassSelector(cleanSelector)) {
        css = `${css}, ${this.prefixSelector}${cleanSelector}`;
      }
      if (this.hasAttribute) {
        css = `${css},${this.prefixSelector}[${this.hasAttribute}] ${cleanSelector}`;
      }
      return css;
    }

    // Handle special case where root tags should be converted into classes
    // rather than being replaced.
    if (this.prefixRootTags) {
      if (cleanSelector.startsWith(":root")) {
        return cleanSelector + " " + this.prefixSelector;
      }
      return this.prefixSelector + " ." + cleanSelector;
    }

    // HTML and Body elements cannot be contained within our container so lets
    // extract their styles.
    return cleanSelector.replace(/^(body|html|:root)/, this.prefixSelector);
  }

  cssRuleMatchesPrefixSelector(cssRule: PostCSSRule): boolean {
    return cssRule.selector.match(this.isPrefixSelector) !== null;
  }

  prefixWrapCSSRule(cssRule: PostCSSRule): void {
    if (this.cssRuleMatchesPrefixSelector(cssRule)) {
      return;
    }

    cssRule.selector = cssRule.selector
      .split(",")
      .map((cssSelector) => this.prefixWrapCSSSelector(cssSelector, cssRule))
      .filter(Selector.isValid)
      .join(", ");
  }

  includeFile(css: PostCSSContainer): boolean {
    // If whitelist exists, check if rule is contained within it.
    if (this.whitelist.length > 0) {
      return this.whitelist.some((currentValue) =>
        css.source?.input.file?.match(currentValue)
      );
    }

    // If blacklist exists, check if rule is not contained within it.
    if (this.blacklist.length > 0) {
      return !this.blacklist.some((currentValue) =>
        css.source?.input.file?.match(currentValue)
      );
    }

    // In all other cases, presume rule should be prefixed.
    return true;
  }

  prefixRoot(css: PostCSSContainer): void {
    if (this.includeFile(css)) {
      css.walkRules((cssRule: PostCSSRule) => {
        this.prefixWrapCSSRule(cssRule);
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  prefix(): Function {
    return (css: PostCSSContainer): void => {
      this.prefixRoot(css);
    };
  }
}
