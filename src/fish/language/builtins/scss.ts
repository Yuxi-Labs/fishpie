import type { LanguageProvider } from "../types";
import { css } from "./css";

export const scss: LanguageProvider = {
  id: "scss",
  tokenize: css.tokenize,
};
