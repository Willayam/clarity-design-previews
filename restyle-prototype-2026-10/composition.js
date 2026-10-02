// packages/composition/src/index.ts
var BARE_STYLE = { background: { kind: "none" }, camera: { shape: "circle", mirror: false } };
var MATTE = "#020617";
function contain(source, bounds) {
  const ratio = source.width / source.height;
  const width = ratio >= bounds.width / bounds.height ? bounds.width : bounds.height * ratio;
  const height = ratio >= bounds.width / bounds.height ? bounds.width / ratio : bounds.height;
  return { x: bounds.x + (bounds.width - width) / 2, y: bounds.y + (bounds.height - height) / 2, width, height };
}
function video(source, crop, dest, style, bubble = false) {
  return { kind: "video", source, crop, dest, shape: bubble ? style.camera.shape : "rect", mirror: source === "camera" && style.camera.mirror };
}
function layoutScene(input) {
  const { style, output, sources } = input;
  const { width, height } = output;
  const full = { x: 0, y: 0, width, height };
  const camera = sources.camera;
  const screen = sources.screen;
  let layout = input.layout;
  if (!screen && layout !== "camera") layout = "camera";
  if (!camera && (layout === "camera" || layout === "bubble" || layout === "split")) layout = "screen";
  const primary = screen && layout !== "camera" ? "screen" : camera ? "camera" : null;
  const layers = [{ kind: "backdrop", fill: style.background, blurOf: style.background.kind === "blur" ? primary : null }];
  if (layout === "camera" && camera) {
    layers.push(video("camera", { x: 0, y: 0, ...camera }, contain(camera, full), style));
  } else if (layout === "screen" && screen) {
    layers.push(video("screen", { x: 0, y: 0, ...screen }, contain(screen, full), style));
  } else if (layout === "split" && camera && screen) {
    const leftWidth = Math.floor(width / 3);
    const screenDest = contain(screen, { x: leftWidth, y: 0, width: width - leftWidth, height });
    const cameraWidth = leftWidth / screenDest.height * camera.height;
    layers.push(video("screen", { x: 0, y: 0, ...screen }, screenDest, style));
    layers.push(video("camera", { x: Math.ceil((camera.width - cameraWidth) / 2), y: 0, width: cameraWidth, height: camera.height }, { x: 0, y: screenDest.y, width: leftWidth, height: screenDest.height }, style));
  } else if (layout === "bubble" && camera && screen) {
    const side = width * 0.15;
    const margin = width * 0.02;
    const cropSide = Math.min(camera.width, camera.height);
    layers.push(video("screen", { x: 0, y: 0, ...screen }, contain(screen, full), style));
    layers.push(video("camera", { x: (camera.width - cropSide) / 2, y: (camera.height - cropSide) / 2, width: cropSide, height: cropSide }, { x: width - side - margin, y: height - side - margin, width: side, height: side }, style, true));
  }
  return { width, height, layers };
}
function paintScene(ctx, scene, host) {
  for (const layer of scene.layers) {
    if (layer.kind === "backdrop") {
      ctx.save();
      const fill = layer.fill;
      if (fill.kind === "gradient") {
        const radians = fill.angleDeg * Math.PI / 180;
        const cx = scene.width / 2;
        const cy = scene.height / 2;
        const distance = Math.hypot(scene.width, scene.height) / 2;
        const gradient = ctx.createLinearGradient(cx - Math.cos(radians) * distance, cy - Math.sin(radians) * distance, cx + Math.cos(radians) * distance, cy + Math.sin(radians) * distance);
        gradient.addColorStop(0, fill.from);
        gradient.addColorStop(1, fill.to);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = fill.kind === "color" ? fill.hex : MATTE;
      }
      ctx.fillRect(0, 0, scene.width, scene.height);
      if (fill.kind === "blur" && layer.blurOf) {
        const source2 = host.frame(layer.blurOf);
        const frame = scene.layers.find((candidate) => candidate.kind === "video" && candidate.source === layer.blurOf);
        if (source2 && frame?.kind === "video") {
          const scale = Math.max(scene.width / frame.crop.width, scene.height / frame.crop.height);
          const w = frame.crop.width * scale;
          const h = frame.crop.height * scale;
          ctx.filter = "blur(24px)";
          ctx.drawImage(source2, frame.crop.x, frame.crop.y, frame.crop.width, frame.crop.height, (scene.width - w) / 2, (scene.height - h) / 2, w, h);
        }
      }
      ctx.restore();
      continue;
    }
    const source = host.frame(layer.source);
    if (!source) continue;
    ctx.save();
    const { crop, dest } = layer;
    if (layer.shape !== "rect") {
      ctx.beginPath();
      if (layer.shape === "circle") ctx.ellipse(dest.x + dest.width / 2, dest.y + dest.height / 2, dest.width / 2, dest.height / 2, 0, 0, Math.PI * 2);
      else ctx.roundRect(dest.x, dest.y, dest.width, dest.height, Math.min(dest.width, dest.height) * 0.22);
      ctx.clip();
    }
    if (layer.mirror) {
      ctx.translate(dest.x * 2 + dest.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, dest.x, dest.y, dest.width, dest.height);
    ctx.restore();
  }
}
export {
  BARE_STYLE,
  MATTE,
  layoutScene,
  paintScene
};
