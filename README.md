# Horizon Orb UI

独立的 **UI-only 开源准备目录**：React 组件、vanilla DOM 封装、白底居中布局、类型、生命周期和 renderer 接入协议。

**不包含 Orb renderer、GLSL、纹理、原站 bundle、恢复的数学内核、录制/探针工具或研究 traces。** 这些恢复素材的再分发权利尚未确认，不应随此目录上传。

此目录可以单独复制到新的代码仓库；不依赖父项目的源码、tsconfig 或 node_modules。它是待审查的开源候选代码，尚未授予开源许可证：目前 `private: true`、`UNLICENSED`，发布保护保留。由项目权利人确认原创代码许可证后再发布。

## 目录

```text
src/
  index.tsx       React component
  vanilla.ts      DOM/iframe lifecycle and audio-level input
  types.ts        Public API and frame-message types
  state.ts        Numeric input sanitation only
  orb.css         Pure white, viewport-centered layout
examples/
  react.tsx
  vanilla.ts
tests/
scripts/
README.md
RENDERER-PROTOCOL.md
LICENSE
NOTICE.md
```

## 独立验证

```sh
npm ci
npm run verify
```

首次没有 lockfile 时使用 `npm install`。验证包含 typecheck、build 和 UI-only 测试，不访问原站、不申请麦克风、不运行逆向实验。

本目录可构建为 UI 包，但**不能在没有 renderer provider 时单独画出完整 Orb**。这是有意设置的版权/实现边界，不是遗漏资源或一个替代视觉效果。

## React

```tsx
import {HorizonOrb} from '@horizon-lab/horizon-orb-ui/react';
import '@horizon-lab/horizon-orb-ui/styles.css';

export function App() {
  return <main className="orb-stage"><div className="orb-host">
    <HorizonOrb
      assetBaseUrl="/authorized-renderer/"
      state="listening"
      audioLevel={0}
    />
  </div></main>;
}
```

使用 `npm run build` 后可在消费者项目中通过本地 file dependency 或本地 tarball 安装。未发布 npm registry；示例中的包名不是可直接在线安装的已发布产品。

`assetBaseUrl` 是调用方单独提供的**同源 renderer 目录**，其中的 `frame.html` 应遵守 RENDERER-PROTOCOL.md。不要把未经授权的 renderer 复制到这个拟开源目录。现有私有项目的 renderer 可以继续留在原位置、本地接入；也可以接入你自行实现并拥有权利的 renderer。

## Vanilla

```ts
import {createHorizonOrb} from '@horizon-lab/horizon-orb-ui/vanilla';
const orb = createHorizonOrb(host, {
  assetBaseUrl: '/authorized-renderer/', state: 'idle', size: 300
});
await orb.ready;
orb.update({state: 'speaking', audioLevel: 0.5});
orb.dispose();
```

## Public API

- `assetBaseUrl: string | URL`：必填，同源 renderer provider；vanilla 实例创建后不可更换，React 更换时重建实例。
- `state`：`idle | listening | thinking | speaking | disconnected`，默认 idle。只是传给 provider 的 UI 状态标签，不含恢复的状态机。
- `audioLevel?: number`：0–1；优先于 audioSource，越界夹取，非有限值归零。
- `audioSource?: AnalyserNode | null`：调用方提供的 analyser，只读取 time-domain RMS；不修改音频图、不自动获取麦克风、不关闭调用方音频资源。
- `size?: number`：正数 CSS 像素；省略时填满父容器，示例 CSS 负责300px/小屏自适应。
- `paused?: boolean`、`className?: string`、`onError?: (error: Error) => void`。

Vanilla controller：`ready`、`update()`、`dispose()`。React18/19，SSR 时不初始化 iframe。附带 ResizeObserver、DPR、暂停、后台/前台处理、reduced-motion 和卸载清理。每个实例使用独立 iframe；相关调度是 UI 产品策略，不声称原站生命周期或端到端 parity。

## 安全与限制

- UI 仅向调用方选定的同源 iframe 发送状态、音量级别、逻辑时间和尺寸；不发送 PCM、原始 FFT 或账号信息。不提供录制或遥测上传。
- provider 是调用方信任的代码；同源检查不是不可信 renderer 的安全沙箱。部署者必须审查它的行为。
- 本 UI 源码不含 WebGL/shader 绘制算法。完整视觉效果、GPU 兼容性和 context loss 恢复由 provider 负责。
- 样式没有文字、控制按钮、录制界面。调试信息通过 onError/控制台处理。
- 不声称此拆分通过了原站像素或端到端 parity；不重新开展 P0–P4。
- 开源前确认 LICENSE；检查实际 Git 暂存文件，勿把父项目、恢复素材、生成的 tarball 或研究数据一并提交。
