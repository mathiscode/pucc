export declare const root: string;
export declare const packageJson: { name: string; version: string };
export declare function bundleConfig(options: {
  production: boolean;
}): import('esbuild').BuildOptions;
export declare function copyFile(from: string, to: string): void;
