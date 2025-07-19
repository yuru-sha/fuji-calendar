import '@testing-library/jest-dom';

// テスト環境のセットアップ
global.console = {
  ...console,
  // テスト中の不要なログを抑制
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 環境変数のモック
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';