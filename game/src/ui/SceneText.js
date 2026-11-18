const layers = new WeakMap();
const unit = (value) => `calc(var(--scene-unit) * ${value})`;
const font = 'system-ui, "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';

function mountLayer(scene) {
  const root = document.createElement('div');
  root.className = 'scene-text-layer';
  Object.assign(root.style, {
    position: 'fixed', overflow: 'hidden', pointerEvents: 'none', zIndex: '15',
    fontFamily: font, lineHeight: '1.35',
  });
  document.body.append(root);

  const labels = new Set();
  const camera = scene.cameras.main;
  const sync = () => {
    const rect = scene.game.canvas.getBoundingClientRect();
    root.style.left = `${rect.left}px`;
    root.style.top = `${rect.top}px`;
    root.style.width = `${rect.width}px`;
    root.style.height = `${rect.height}px`;
    root.style.setProperty('--scene-unit', `${rect.width / scene.scale.gameSize.width}px`);
  };

  const render = () => {
    root.style.opacity = String(1 - (camera.fadeEffect?.alpha ?? 0));
    for (const label of labels) {
      const x = label.x - (label.world ? camera.scrollX : 0);
      const y = label.y - (label.world ? camera.scrollY : 0);
      label.element.style.left = unit(x);
      label.element.style.top = unit(y);
      label.element.style.opacity = String(label.alpha);
    }
  };

  const destroy = () => {
    window.removeEventListener('resize', sync);
    scene.scale.off('resize', sync);
    scene.events.off('render', render);
    root.remove();
    layers.delete(scene);
  };
  window.addEventListener('resize', sync);
  scene.scale.on('resize', sync);
  scene.events.on('render', render);
  scene.events.once('shutdown', destroy);
  sync();

  const layer = { root, labels, render };
  layers.set(scene, layer);
  return layer;
}

export function addSceneText(scene, x, y, text, {
  size = 10, color = '#eee0c5', weight = 500, center = false, world = false,
  background, width, tag = 'div', name,
} = {}) {
  const layer = layers.get(scene) ?? mountLayer(scene);
  const element = document.createElement(tag);
  element.textContent = text;
  if (name) element.dataset.sceneText = name;
  Object.assign(element.style, {
    position: 'absolute', width: width ? unit(width) : 'max-content',
    maxWidth: '100%', boxSizing: 'border-box',
    fontSize: unit(size), fontWeight: String(weight),
    color, whiteSpace: 'pre-line', overflowWrap: 'anywhere',
    textAlign: center ? 'center' : 'left',
    transform: center ? 'translate(-50%, -50%)' : '',
  });
  if (background) {
    element.style.background = background;
    element.style.padding = `${unit(3)} ${unit(5)}`;
  }
  const label = {
    x, y, alpha: 1, element, world,
    destroy() {
      layer.labels.delete(label);
      element.remove();
    },
  };
  layer.labels.add(label);
  layer.root.append(element);
  layer.render();
  return label;
}
