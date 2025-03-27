// sketch.js – AE Feature Selection + Latent Space Drop Simulation

let points = [];
let colors = [];
let numPoints = 45;
let canvasWidth = 800;
let canvasHeight = 400;
let margin = 60;
let radius = 10;
let hoverIndex = -1;
let selected = [];
let latentPoints = [];
let state = "select";
let fontLoaded = false;
let camZoom = 500;

function preload() {
  fontLoaded = loadFont("https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Regular.otf");
}

function setup() {
  createCanvas(canvasWidth, canvasHeight, WEBGL);
  colorMode(HSB);
  textFont(fontLoaded);
  generateReducedWavePoints();
}

function draw() {
  background(255);

  if (state === "select") {
    ortho(-width / 2, width / 2, -height / 2, height / 2, -1000, 1000);
    drawAxis2D();
    drawInterpolatedWaveform();
    drawPoints();
    drawSelectedCount();
  } else if (state === "latent") {
    background(255);
    orbitControl(1, 1, 0.1);

    push();
    rotateX(PI / 6);
    rotateY(-PI / 6);
    drawLatentSpace();
    drawLatentAxes();
    pop();
  }
}

function generateReducedWavePoints() {
  points = [];
  colors = [];
  selected = [];
  let melFreqs = [430, 0, 1420, 718, 574, 2600, 574, 430, 1435, 2042, 1588, 1294, 1110, 1110, 2600, 1435, 2042, 1435, 1294, 1294, 2042, 1110, 1435, 718, 2042, 2042, 1110, 1110, 2042, 2600, 430, 2042, 2042, 1110, 1110, 430, 430, 2600, 2042, 2042, 1294, 1435, 430, 2600, 430, 2042];
  let amps = [-62, -57, -46, -37, -22, -48, -20, -29, -39, -31, -34, -41, -45, -32, -42, -35, -32, -41, -35, -45, -38, -29, -43, -40, -41, -42, -39, -36, -33, -44, -46, -38, -36, -37, -39, -40, -41, -38, -36, -34, -30, -28, -25, -32, -37];
  let louds = [-43, -37, -26, -23, -7, -22, -5, -15, -25, -18, -20, -29, -34, -24, -32, -27, -25, -30, -27, -32, -28, -17, -30, -28, -30, -32, -31, -28, -25, -33, -35, -28, -27, -29, -30, -31, -32, -30, -28, -27, -24, -22, -19, -26, -30];

  for (let i = 0; i < numPoints; i++) {
    let x = map(i, 0, numPoints - 1, -canvasWidth / 2 + margin, canvasWidth / 2 - margin);
    let y = map(amps[i], -70, 0, canvasHeight / 2 - 20, -canvasHeight / 2 + 20);
    let hue = map(melFreqs[i], 0, 8000, 0, 360);
    let size = map(louds[i], -80, 0, 5, 25);
    points.push({ x, y, hue, size, loudness: louds[i], freq: melFreqs[i] });
    selected.push(false);
    colors.push(color(hue, 80, 80, 0.8));
  }
}

function drawInterpolatedWaveform() {
  noFill();
  stroke(180, 30, 80, 1);
  strokeWeight(2.5);
  beginShape();
  for (let i = 0; i < points.length; i++) {
    curveVertex(points[i].x, points[i].y);
  }
  endShape();
}

function drawPoints() {
  hoverIndex = -1;
  for (let i = 0; i < points.length; i++) {
    let p = points[i];
    let d = dist(mouseX - width / 2, mouseY - height / 2, p.x, p.y);
    if (d < radius + 5) hoverIndex = i;

    fill(colors[i]);
    if (selected[i]) {
      stroke(colors[i]);
      strokeWeight(3);
      ellipse(p.x, p.y, p.size * 1.6);
    } else {
      noStroke();
      ellipse(p.x, p.y, p.size);
    }
  }
}

function drawSelectedCount() {
  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(14);
  text(`Selected: ${selected.filter(v => v).length} / 16`, -canvasWidth / 2 + margin, -canvasHeight / 2 + 10);
}

function drawAxis2D() {
  stroke(220);
  line(-canvasWidth / 2 + margin, 0, canvasWidth / 2 - margin, 0);
}

function drawLatentSpace() {
  for (let pt of latentPoints) {
    push();
    fill(pt.col);
    noStroke();
    translate(pt.x, pt.y, pt.z);
    sphere(8);
    pop();
  }
}

function drawLatentAxes() {
  strokeWeight(1);
  stroke(0);
  line(-200, 0, 0, 200, 0, 0);
  line(0, -200, 0, 0, 200, 0);
  line(0, 0, -200, 0, 0, 200);

  push();
  fill(0);
  textSize(12);
  textAlign(CENTER, CENTER);
  translate(210, 0, 0);
  text("Freq", 0, 0);
  pop();

  push();
  fill(0);
  textSize(12);
  textAlign(CENTER, CENTER);
  translate(0, -210, 0);
  text("Loud", 0, 0);
  pop();

  push();
  fill(0);
  textSize(12);
  textAlign(CENTER, CENTER);
  translate(0, 0, 210);
  text("Amp", 0, 0);
  pop();
}

function handleClick(x, y) {
  if (state !== "select") return;
  for (let i = 0; i < points.length; i++) {
    let p = points[i];
    if (dist(x, y, p.x, p.y) < radius + 5) {
      selected[i] = !selected[i];
      triggerKeyframe(`select-${i}`);
      break;
    }
  }
  if (selected.filter(v => v).length === 16) {
    triggerKeyframe("transition-to-latent");
    prepareLatentPoints();
  }
}

function triggerKeyframe(name) {
  if (window.parent && window.parent.postMessage) {
    window.parent.postMessage({ type: "ae-keyframe", name: name }, "*");
  }
}

function prepareLatentPoints() {
  latentPoints = [];
  for (let i = 0; i < points.length; i++) {
    if (selected[i]) {
      let p = points[i];
      let x = map(p.freq, 0, 8000, -150, 150);
      let y = map(p.loudness, -80, 0, -150, 150);
      let z = map(p.y, -canvasHeight / 2, canvasHeight / 2, -150, 150);
      latentPoints.push({ x, y, z, col: colors[i] });
    }
  }
  state = "latent";
}

function mousePressed() {
  handleClick(mouseX - width / 2, mouseY - height / 2);
}

function touchStarted() {
  if (touches.length > 0) {
    handleClick(touches[0].x - width / 2, touches[0].y - height / 2);
  }
  return false;
}
