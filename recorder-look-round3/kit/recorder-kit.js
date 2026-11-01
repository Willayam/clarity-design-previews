// Shared kit for the recorder design lab. Variants differ only in how the controls are designed.
// Everything here mirrors production: real shell markup, real button classes, the real scene geometry.
(function () {
  const base = document.currentScript.src.replace(/[^/]*$/, "");
  const css = document.createElement("style");
  css.textContent = `
    .kit-scene{position:relative;overflow:hidden;background:#020617;width:100%;height:100%;display:block}
    .kit-cell{position:absolute;background-repeat:no-repeat;background-position:center;background-size:cover}
    .kit-face{background-repeat:no-repeat;background-position:60% 34%;background-size:215%}
    html,body{margin:0}
  `;
  document.head.append(css);

  const LAYOUTS = [
    { id: "camera", label: "Camera", needsScreen: false },
    { id: "split", label: "Side by side", needsScreen: true },
    { id: "inset", label: "Inset", needsScreen: true },
    { id: "screen", label: "Screen", needsScreen: true },
  ];
  const BACKGROUNDS = [
    { id: "keep", label: "Original" },
    { id: "blur", label: "Blur" },
    { id: "blue", label: "Blue", hex: "#2563eb" },
    { id: "slate", label: "Slate", hex: "#020617" },
  ];
  const SHAPES = [
    { id: "circle", label: "Circle" },
    { id: "squircle", label: "Rounded" },
    { id: "cutout", label: "Cutout" },
  ];

  /** Which controls change the picture right now. Every variant must honour this. */
  function applies({ layout, shape }) {
    return {
      shape: layout === "inset",
      background: layout !== "screen" && !(layout === "inset" && shape === "cutout"),
      cutout: layout === "inset",
    };
  }

  function personLayers(background) {
    const url = (name) => `url('${base}${name}')`;
    if (background === "keep") return `background-image:${url("camera.jpg")}`;
    if (background === "blur") return `background-image:${url("camera-blur.jpg")}`;
    const hex = BACKGROUNDS.find((option) => option.id === background)?.hex ?? "#020617";
    return `background-image:${url("person.png")};background-color:${hex}`;
  }

  /** Paints the take into `el` with production geometry. Percentages, so it works at any size: give `el` a width and a 16 / 9 aspect ratio. */
  function scene(el, state) {
    const s = { layout: "inset", background: "keep", shape: "circle", screen: true, bubble: "small", ...state };
    const layout = s.screen ? s.layout : "camera";
    const screen = (pos) => `<span class="kit-cell" style="${pos};background-image:url('${base}screen.png');background-size:100% 100%"></span>`;
    let html = "";
    if (layout === "camera") html = `<span class="kit-cell" style="inset:0;${personLayers(s.background)}"></span>`;
    if (layout === "screen") html = screen("left:5%;top:0;width:90%;height:100%");
    if (layout === "split") html = screen("left:33.333%;top:12.963%;width:66.667%;height:74.074%") + `<span class="kit-cell" style="left:0;top:12.963%;width:33.333%;height:74.074%;${personLayers(s.background)}"></span>`;
    if (layout === "inset") {
      html = screen("left:5%;top:0;width:90%;height:100%");
      if (s.shape === "cutout") html += `<span class="kit-cell" style="right:2%;bottom:0;width:45%;height:45%;background-image:url('${base}person.png');background-size:100% 100%"></span>`;
      else {
        const large = s.bubble === "large";
        const radius = s.shape === "circle" ? "50%" : large ? "30%" : "22%";
        const box = large ? "right:4%;bottom:7.1%;width:18%;height:32%;box-shadow:0 6px 24px rgb(0 0 0 / 0.28)" : "right:2%;bottom:3.556%;width:15%;height:26.667%";
        html += `<span class="kit-cell" style="${box};border-radius:${radius};${personLayers(s.background)}"></span>`;
      }
    }
    el.classList.add("kit-scene");
    el.innerHTML = html;
  }

  /** A close crop of the person on a background, for swatches. Give `el` a size and a radius. */
  function face(el, background) {
    el.classList.add("kit-face");
    el.setAttribute("style", `${el.getAttribute("style") ?? ""};${personLayers(background)}`);
  }

  function store(initial) {
    let value = { layout: "inset", background: "keep", shape: "circle", screen: new URLSearchParams(location.search).get("screen") !== "none", ...initial };
    const listeners = new Set();
    return {
      get: () => value,
      set(change) { value = { ...value, ...change }; listeners.forEach((listener) => listener(value)); },
      subscribe(listener) { listeners.add(listener); listener(value); return () => listeners.delete(listener); },
    };
  }

  /** The Style tab's real status sequence, in about three seconds. `onStatus` gets {kind, percent?}. Returns a cancel function. */
  function fakeApply(onStatus) {
    const steps = [["rendering", 12], ["rendering", 38], ["rendering", 71], ["rendering", 96], ["uploading"], ["processing"], ["done"]];
    let i = 0;
    const tick = () => { const [kind, percent] = steps[i++]; onStatus({ kind, percent }); if (i < steps.length) timer = setTimeout(tick, 480); };
    let timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }

  /** All status and notice copy lives here so variants compare on design. */
  function statusCopy(status) {
    switch (status.kind) {
      case "rendering": return `Rendering ${status.percent}%. Keep this tab open`;
      case "uploading": return "Uploading. Keep this tab open";
      case "processing": return "Processing";
      case "done": return "Viewers now see this version";
      case "saving": return "Saving the original sources. Keep this tab open.";
      default: return "";
    }
  }

  const captured = fetchSync(`${base}captured.json`);
  function fetchSync(url) { const request = new XMLHttpRequest(); request.open("GET", url, false); request.send(); return JSON.parse(request.responseText); }

  function icon(name, size = 16, className = "") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${className}">${captured.icons[name] ?? ""}</svg>`;
  }

  /** The product's real Button. variant/size: default/default, default/lg-thumb, outline/sm, outline/lg-thumb, ghost/sm, ghost/icon. record adds the red record action. */
  function button({ variant = "default", size = "default", label, iconName, record = false, attrs = "" }) {
    const open = (captured.buttons[`${variant}/${size}`] ?? captured.buttons["default/default"]).replace(/\sdata-record-action(="[^"]*")?/, "");
    const tag = open.replace(/>$/, ` ${record ? "data-record-action" : ""} ${attrs}>`);
    return `${tag}${iconName ? icon(iconName, 16) : ""}${record ? '<span class="size-3 flex-none rounded-full bg-current"></span>' : ""}${label}</button>`;
  }

  /** The app shell at its real size: sidebar rail and page header. Returns the empty scrolling main the variant fills. */
  function mountShell(title = "Record video") {
    const prefix = captured.prefix.replace(/(>)Record video(<)/, `$1${title}$2`).replaceAll("__KIT__", base);
    document.body.innerHTML = `${prefix}<div id="kit-page" class="min-w-0 px-6 pt-4 pb-12 max-sm:px-4"></div>`;
    return document.getElementById("kit-page");
  }


  // ---- The Layout drawer model, round 3. Every control below maps to something the engine paints or could paint with a small change. ----
  const STYLES = [
    { id: "bubble", label: "Bubble" },
    { id: "cutout", label: "Cut-out" },
    { id: "split", label: "Split" },
    { id: "camera", label: "Camera" },
    { id: "screen", label: "Screen" },
  ];
  const POSITIONS = [
    { id: "br", label: "Bottom right" }, { id: "bl", label: "Bottom left" },
    { id: "tr", label: "Top right" }, { id: "tl", label: "Top left" },
  ];
  const SHAPES2 = [{ id: "squircle", label: "Rounded" }, { id: "circle", label: "Circle" }];
  const SIZES = [{ id: "small", label: "Small" }, { id: "normal", label: "Normal" }, { id: "large", label: "Large" }];
  const SWATCHES = [
    { id: "sky", label: "Sky", css: "linear-gradient(135deg,#dbe8ff,#6f9dff)" },
    { id: "ocean", label: "Ocean", css: "linear-gradient(135deg,#38bdf8,#1e3a8a)" },
    { id: "dusk", label: "Dusk", css: "linear-gradient(135deg,#6366f1,#db2777)" },
    { id: "coral", label: "Coral", css: "linear-gradient(135deg,#fecaca,#f97316)" },
    { id: "sand", label: "Sand", css: "linear-gradient(135deg,#f5e6d3,#c9a27e)" },
    { id: "mint", label: "Mint", css: "linear-gradient(135deg,#d1fae5,#34d399)" },
    { id: "mist", label: "Mist", css: "linear-gradient(135deg,#f1f5f9,#cbd5e1)" },
    { id: "plum", label: "Plum", css: "linear-gradient(135deg,#581c87,#1e1b4b)" },
    { id: "slate", label: "Slate", css: "linear-gradient(135deg,#334155,#0f172a)" },
    { id: "blue", label: "Blue", css: "linear-gradient(135deg,#2563eb,#2563eb)" },
  ];
  const swatch = (id) => SWATCHES.find((option) => option.id === id)?.css ?? SWATCHES[0].css;

  const DRAWER_DEFAULT = { style: "bubble", position: "br", shape: "squircle", size: "normal", mirror: false, blur: false, cameraBg: null, screenBg: null, screen: true };

  /** Which drawer controls change the picture right now. Every variant must honour this. A cut-out only stands on the frame's bottom, so it has no top positions. */
  function drawerApplies({ style }) {
    return {
      position: style === "bubble" || style === "cutout",
      topPositions: style === "bubble",
      shape: style === "bubble",
      size: style === "bubble" || style === "cutout",
      mirror: style !== "screen",
      blur: style === "bubble" || style === "split" || style === "camera",
      cameraBg: style === "bubble" || style === "split" || style === "camera",
      screenBg: style !== "camera",
    };
  }

  function drawerStore(initial) {
    let value = { ...DRAWER_DEFAULT, screen: new URLSearchParams(location.search).get("screen") !== "none", ...initial };
    const listeners = new Set();
    return {
      get: () => value,
      set(change) {
        value = { ...value, ...change };
        if (change.blur === true) value.cameraBg = null;
        if (change.cameraBg) value.blur = false;
        if (value.style === "cutout" && value.position[0] === "t") value.position = `b${value.position[1]}`;
        listeners.forEach((listener) => listener(value));
      },
      subscribe(listener) { listeners.add(listener); listener(value); return () => listeners.delete(listener); },
    };
  }

  /** Paints the drawer's state into `el` at any size. Give `el` a width and a 16 / 9 aspect ratio. A frame of `scale` sets the shadow's reach for small thumbnails. */
  function drawerScene(el, state) {
    const s = { ...DRAWER_DEFAULT, ...state };
    const style = s.screen ? s.style : "camera";
    const person = () => {
      const flip = s.mirror ? "transform:scaleX(-1);" : "";
      if (s.blur) return `${flip}background-image:url('${base}camera-blur.jpg')`;
      if (s.cameraBg) return `${flip}background-image:url('${base}person.png'),${swatch(s.cameraBg)};background-size:cover,cover;background-position:center,center`;
      return `${flip}background-image:url('${base}camera.jpg')`;
    };
    const inset = s.screenBg && style !== "camera";
    const screenCell = (box) => `<span class="kit-cell" style="${box};background-image:url('${base}screen.png');background-size:100% 100%${inset ? ";border-radius:1.4cqw;box-shadow:0 1cqw 3cqw rgb(0 0 0 / 0.3)" : ""}"></span>`;
    const full = inset ? "left:9.5%;top:7%;width:81%;height:86%" : "left:5%;top:0;width:90%;height:100%";
    const v = s.position[0] === "t" ? "top" : "bottom", h = s.position[1] === "l" ? "left" : "right";
    let html = "";
    if (style === "camera") html = `<span class="kit-cell" style="inset:0;${person()}"></span>`;
    if (style === "screen") html = screenCell(full);
    if (style === "split") html = screenCell(inset ? "left:35.5%;top:15%;width:61%;height:70%" : "left:33.333%;top:12.963%;width:66.667%;height:74.074%") + `<span class="kit-cell" style="left:${inset ? "3.5%" : "0"};top:${inset ? "15%" : "12.963%"};width:${inset ? "29%" : "33.333%"};height:${inset ? "70%" : "74.074%"};${inset ? "border-radius:1.4cqw;" : ""}${person()}"></span>`;
    if (style === "bubble") {
      const w = { small: 14, normal: 18, large: 24 }[s.size];
      const radius = s.shape === "circle" ? "50%" : "30%";
      html = screenCell(full) + `<span class="kit-cell" style="${h}:4%;${v}:7.1%;width:${w}%;height:${w * 16 / 9}%;border-radius:${radius};box-shadow:0 .5cqw 2cqw rgb(0 0 0 / 0.28);${person()}"></span>`;
    }
    if (style === "cutout") {
      const p = { small: 35, normal: 45, large: 60 }[s.size];
      html = screenCell(full) + `<span class="kit-cell" style="${h}:2%;bottom:0;width:${p}%;height:${p}%;background-image:url('${base}person.png');background-size:100% 100%${s.mirror ? ";transform:scaleX(-1)" : ""}"></span>`;
    }
    el.classList.add("kit-scene");
    el.style.containerType = "inline-size";
    el.style.background = inset ? swatch(s.screenBg) : "#020617";
    el.innerHTML = html;
  }

  window.RecorderKit = {
    STYLES, POSITIONS, SHAPES2, SIZES, SWATCHES, DRAWER_DEFAULT, drawerApplies, drawerStore, drawerScene, LAYOUTS, BACKGROUNDS, SHAPES, applies, scene, face, store, fakeApply, statusCopy, icon, button, mountShell,
    /** The real camera and microphone pickers, with the level meter. A string of markup. */
    deviceControls: () => captured.devices,
    /** The real Trim and Style segmented control, Style selected. A string of markup. */
    trimStyleTabs: () => captured.segment,
    /** The finish screen's three actions, in production order. */
    finishActions: () => button({ variant: "outline", size: "lg-thumb", label: "Re-record", iconName: "rotate-ccw" }) + button({ variant: "default", size: "lg-thumb", label: "Build page", iconName: "sparkles" }) + button({ variant: "outline", size: "lg-thumb", label: "Copy link", iconName: "copy" }),
    /** Pass as the --frame-width of a centred column to get the recorder's real preview width. */
    FRAME_WIDTH: "min(100%, calc(55dvh * 1.7777777777777777), calc(52rem * 1.7777777777777777))",
  };
})();
