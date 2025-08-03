module.exports = {
  // 基本設定
  semi: true,
  trailingComma: 'es5',
  singleQuote: false,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  
  // React/JSX 設定
  jsxSingleQuote: false,
  jsxBracketSameLine: false,
  
  // その他の設定
  quoteProps: 'as-needed',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  
  // ファイル別設定
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 120,
        proseWrap: 'always',
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
  ],
};