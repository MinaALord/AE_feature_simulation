// sketch.js – AE Feature Selection + Latent Space Drop Simulation (Scenes 1–6)
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
let nextButton;
let dragPoints = [];
let staticLatents = [];
let fillerLatents = [];
let sample110 = null;
let showZArrow = false;
let encodeBtn, decodeBtn, sphereBtn;
let sample110Encoded = false;
let showSpheres = false;
let sample110Sphere = false;
let condenseBtn;
let condensed = false;
let sample110VisibleInScene5 = false;
let epsilonXSlider, epsilonYSlider, epsilonZSlider;
let epsilonX = 1, epsilonY = 1, epsilonZ = 1;
let sigma = 30; // Scaling factor for ε
let decodeBtn6;
let z6Visible = false;
let cam;
let overSlider = false;
let epsilonDebugFrame = 0;
let canvasWrapper;
let hud; // Offscreen 2D graphics for HUD layer 
let zoomTarget = 300;
let zoomSpeed = 0.05;
let hudLayer;
let zoomedOnce = false;

function preload() {
  fontLoaded = loadFont("https://cdnjs.cloudflare.com/ajax/libs/topcoat/0.8.0/font/SourceCodePro-Regular.otf");
}

function isMouseOverSlider(slider) {
  const r = slider.elt.getBoundingClientRect();
  return mouseX >= r.left && mouseX <= r.right &&
         mouseY >= r.top && mouseY <= r.bottom;
}

function setup() {
  let cnv = createCanvas(canvasWidth, canvasHeight, WEBGL);
  canvasWrapper = createDiv();
  canvasWrapper.style("position", "relative");
  cnv.parent(canvasWrapper);
  canvasWrapper.parent(document.body);

  hudLayer = createGraphics(canvasWidth, canvasHeight); // 2D HUD layer
  hudLayer.pixelDensity(1);

  colorMode(HSB);
  textFont(fontLoaded);
  generateReducedWavePoints();
  createUI();
  cam = createCamera();
  prepareStaticLatents();
  prepareFillerLatents();

  [epsilonXSlider, epsilonYSlider, epsilonZSlider, decodeBtn6, encodeBtn6].forEach(ctrl => {
    if (ctrl) ctrl.parent(canvasWrapper);
  });
}

function draw() {
  background(255);
  const sliderLength = 100;
  const circleRight = width - 30;
  const sliderX = circleRight - sliderLength;
  const hudTopY = 130;
  const lineSpacing = 30;
  if (state === "select") {
    ortho(-width / 2, width / 2, -height / 2, height / 2, -1000, 1000);
    drawAxis2D();
    drawInterpolatedWaveform();
    drawPoints();
    drawSelectedCount();
    nextButton.html("Encodieren (AE)");
    nextButton.position(width - 160, height - 40);
    encodeBtn4.hide(); encodeBtn6.hide();
    decodeBtn.hide();
    sphereBtn.hide();
    condenseBtn.hide();
  } else if (state === "latent") {
    orbitControl(1, 1, 0.1);
    push();
    rotateX(PI / 6);
    rotateY(-PI / 6);
    drawLatentSpace();
    drawLatentAxes();
    pop();
    nextButton.html("Decodieren (AE)");
    nextButton.position(width - 160, height - 40);
    nextButton.show();
    encodeBtn4.hide();
    encodeBtn6.hide();
    decodeBtn.hide();
    sphereBtn.hide();
    condenseBtn.hide();
  } else if (state === "reconstruct") {
    ortho(-width / 2, width / 2, -height / 2, height / 2);
    background(255);
    drawReconstructionScene();
    nextButton.html("Latent Space (AE)");
    nextButton.position(width - 160, height - 40);
    nextButton.show();
    encodeBtn4.hide();
    encodeBtn6.hide();
    decodeBtn.hide();
    sphereBtn.hide();
    condenseBtn.hide();
  } else if (state === "latent-multi") {
    background(255);
    orbitControl();
    push();
    rotateX(PI / 6);
    rotateY(-PI / 6);
    drawLatentAxes();
    drawFullLatentSpace();
    if (sample110Encoded) drawSample110();
    if (sample110Encoded && showZArrow) drawZArrow();
    pop();    
    const rightMargin = 30;
    const rightX4 = width - rightMargin;

    encodeBtn4.position(rightX4 - encodeBtn4.width, hudTopY);
    decodeBtn.position(rightX4 - decodeBtn.width, hudTopY + lineSpacing);
    nextButton.html("Latent Space Distribution (VAE)");
    nextButton.position(width - nextButton.elt.offsetWidth - 30, height - 40);

    encodeBtn4.show();
    decodeBtn.show();
    nextButton.show();

    encodeBtn6.hide();
    sphereBtn.hide();
    condenseBtn.hide();
  } else if (state === "vae-cloud") {
    background(255);
    orbitControl();
    push();
    rotateX(PI / 6);
    rotateY(-PI / 6);
    drawLatentAxes();
    drawFullLatentSpace();

    if (sample110VisibleInScene5) {
      drawSample110();
    }
    
    if (showSpheres) drawSpheres();

    if (condensed) {
      for (let p of staticLatents) {
        if (dist(p.x, p.y, p.z, 0, 0, 0) > 50) {
          p.x += (0 - p.x) * 0.08;
          p.y += (0 - p.y) * 0.08;
          p.z += (0 - p.z) * 0.08;
        }
      }
    }

    if (sample110VisibleInScene5 && sample110Sphere && showSpheres) {
      drawSample110Sphere();
    }
    pop();
    const rightMargin = 30;
    const rightX5 = width - rightMargin;

    sphereBtn.position(rightX5 - sphereBtn.width, hudTopY);
    condenseBtn.position(rightX5 - condenseBtn.width, hudTopY + lineSpacing);
    encodeBtn6.position(rightX5 - encodeBtn6.width, hudTopY + lineSpacing * 2);
    decodeBtn6.position(rightX5 - decodeBtn6.width, height -40);

    sphereBtn.show();
    condenseBtn.show();
    encodeBtn6.show();
    decodeBtn6.show();

    nextButton.hide();
    decodeBtn.hide();
    encodeBtn4.hide();
  } else if (state === "zoom110") {
    background(240);

    // Custom close camera position FINGER WEG!!!!
    cam.setPosition(-80, -180, 20);
    cam.lookAt(0, 0, 0);
    if (!overSlider && mouseIsPressed) orbitControl();
    //orbitControl();

    // ε sliders
    epsilonX = epsilonXSlider.value();
    epsilonY = epsilonYSlider.value();
    epsilonZ = epsilonZSlider.value();
    //console.log("[Z-Vector] ε: ", epsilonX, epsilonY, epsilonZ);

    // μ = sample110 (unscaled space)
    let mu = createVector(sample110.x, sample110.y, sample110.z);

    // raw z = μ + σ * ε
    let rawZ = createVector(
      mu.x + sigma * epsilonX,
      mu.y + sigma * epsilonY,
      mu.z + sigma * epsilonZ
    );

    // Clamp to radius = 60 (unscaled!)
    let dir = p5.Vector.sub(rawZ, mu);
    let maxRadius = 60; // <--- NOT scaled here
    if (dir.mag() > maxRadius) dir.setMag(maxRadius);

    // final z in 3D space
    let finalZ = p5.Vector.add(mu, dir);
    let [zX, zY, zZ] = [finalZ.x, finalZ.y, finalZ.z];

    push();
    scale(2.3);
    push();
    rotateX(radians(0));     // ← Adjust for tilt up/down
    rotateY(radians(-0.9));  // ← Adjust for left/right turn
    drawLatentAxes();
    drawFullLatentSpace();
    
    // 6. Draw it
    if (z6Visible) {
      stroke(0, 100, 100);
      strokeWeight(3);
      line(0, 0, 0, zX, zY, zZ);
    }


    drawSample110();
    if (sample110Sphere && showSpheres) drawSample110Sphere();
    if (showSpheres) drawSpheres();
    pop(); // inner push (rotate)
    pop(); // outer push (scale)

    // ---- 2D HUD OVERLAY ----
    hudLayer.clear();
    hudLayer.textAlign(RIGHT, CENTER);
    hudLayer.textSize(11);
    hudLayer.fill(0);
    const sliderLength = 100;
    const circleRight = width - 45;
    const sliderX = circleRight - sliderLength;
    const hudTopY = 130;
    const lineSpacing = 30;
    hudLayer.text("epsilon₁", width - 45, hudTopY);
    hudLayer.text("epsilon₂", width - 45, hudTopY + lineSpacing);
    hudLayer.text("epsilon₃", width - 45, hudTopY + lineSpacing * 2);

    resetMatrix();
    camera();
    noLights();
    push();
    translate(0, 0, 1);
    texture(hudLayer);
    plane(width, height);
    pop();

    // UI sliders and buttons
    epsilonXSlider.position(sliderX, hudTopY + 5);
    epsilonYSlider.position(sliderX, hudTopY + lineSpacing + 5);
    epsilonZSlider.position(sliderX, hudTopY + lineSpacing * 2 + 5);
    epsilonXSlider.style('width', sliderLength + 'px');
    epsilonYSlider.style('width', sliderLength + 'px');
    epsilonZSlider.style('width', sliderLength + 'px');
    epsilonXSlider.show();
    epsilonYSlider.show();
    epsilonZSlider.show();

    //decodeBtn6.position(160, height - 40);
    decodeBtn6.hide();
    encodeBtn6.hide();
    condenseBtn.hide();
    sphereBtn.hide();
  }
}

function drawSample110() {
  if (!sample110Encoded || !sample110) return;
  push();
  translate(sample110.x, sample110.y, sample110.z);
  fill(sample110.col);
  noStroke();
  sphere(12);
  pop();
}

function drawSample110Sphere() {
  if (!sample110Encoded || !sample110) return;
  push();
  translate(sample110.x, sample110.y, sample110.z);
  fill(hue(sample110.col), saturation(sample110.col), brightness(sample110.col), 0.15);
  noStroke();
  sphere(60);
  pop();
}

function drawZArrow() {
  if (sample110Encoded && sample110) {
    stroke(0, 100, 100);
    strokeWeight(2);
    line(0, 0, 0, sample110.x, sample110.y, sample110.z);
  }
}

function drawSpheres() {
  for (let pt of staticLatents) {
    push();
    translate(pt.x, pt.y, pt.z);
    fill(hue(pt.col), saturation(pt.col), brightness(pt.col), 0.15);
    noStroke();
    sphere(60);
    pop();
  }
}

function drawAxis2D() {
  stroke(220);
  line(-canvasWidth / 2 + margin, 0, canvasWidth / 2 - margin, 0);
}


function createUI() {
  nextButton = createButton("Next Scene");
  nextButton.mousePressed(() => {
    if (state === "select") state = "latent";
    else if (state === "latent") state = "reconstruct";
    else if (state === "reconstruct") state = "latent-multi";
    else if (state === "latent-multi") state = "vae-cloud";
    else if (state === "vae-cloud") state = "epsilon";
  });

  encodeBtn4 = createButton("encoding x");
  encodeBtn4.mousePressed(() => {
    sample110 = {
      x: map(3600, 3400, 3900, -200, 200),
      y: map(247, 240, 255, -200, 200),
      z: map(153, 130, 200, -200, 200),
      col: color(0, 90, 90)
    };
    sample110Encoded = true;
  });

  encodeBtn6 = createButton("encode p(x)");
  encodeBtn6.mousePressed(() => {
    let rawX = map(3600, 3400, 3900, -200, 200);
    let rawY = map(247, 240, 255, -200, 200);
    let rawZ = map(153, 130, 200, -200, 200);
    sample110 = { x: rawX * 0.9, y: rawY * 0.9, z: rawZ * 0.9, col: color(0, 90, 90) };
    sample110Encoded = true;
    sample110Sphere = true;
    sample110VisibleInScene5 = true;
  });

  decodeBtn = createButton("Decode (z = x)");
  decodeBtn.mousePressed(() => {
    showZArrow = true;
  });

  sphereBtn = createButton("p(x) für Kontinuität");
  sphereBtn.mousePressed(() => {
    showSpheres = true;
  });
  
  condenseBtn = createButton("Raum verdichten");
  condenseBtn.mousePressed(() => {
    condensed = true;
    fillerLatents = [];
  });
  condenseBtn.hide();
  
  epsilonXSlider = createSlider(-2, 2, 1, 0.01);
  epsilonYSlider = createSlider(-2, 2, 1, 0.01);
  epsilonZSlider = createSlider(-2, 2, 1, 0.01);

  epsilonXSlider.hide();
  epsilonYSlider.hide();
  epsilonZSlider.hide();
  
  decodeBtn6 = createButton("decode zₑ = p(x)");
  decodeBtn6.mousePressed(() => {
    console.log("[decodeBtn6] → switch to Scene 7");
    z6Visible = true;
    state = "zoom110";
    epsilonXSlider.value(0);
    epsilonYSlider.value(0);
    epsilonZSlider.value(0);
  });
  decodeBtn6.hide();

}

function nextScene() {
  if (state === "select") state = "latent";
  else if (state === "latent") state = "reconstruct";
  else if (state === "reconstruct") state = "latent-multi";
  else if (state === "latent-multi") state = "vae-cloud";
  else if (state === "vae-cloud") state = "epsilon";
}

function prepareStaticLatents() {
  let rawData = [
    { name: "sample127", freq: 3880, amp: 189.8, loud: 255 },
    { name: "sample4", freq: 3800, amp: 165.8, loud: 245 },
    { name: "sample11", freq: 3760, amp: 154.2, loud: 248 },
    { name: "sample13", freq: 3420, amp: 138.9, loud: 240 },
    { name: "sample26", freq: 3840, amp: 160.0, loud: 247 },
    { name: "sample34", freq: 3785, amp: 178.1, loud: 243 },
    { name: "sample86", freq: 3550, amp: 157.0, loud: 246 },
    { name: "sample98", freq: 3685, amp: 155.7, loud: 244 },
    { name: "sample117", freq: 3490, amp: 150.0, loud: 242 }
  ];

  staticLatents = rawData.map(d => {
    let x = map(d.freq, 3400, 3900, -200, 200);
    let y = map(d.loud, 240, 255, -200, 200);
    let z = map(d.amp, 130, 200, -200, 200);
    let hue = map(d.freq, 3400, 3900, 200, 60); // custom hue range: yellow to blue
    let col = color(hue, 80, 80);
    return { ...d, x, y, z, col };
  });
}

function prepareFillerLatents() {
  for (let base of staticLatents) {
    for (let i = 0; i < 5; i++) {
      let x = base.x + random(-60, 60);
      let y = base.y + random(-60, 60);
      let z = base.z + random(-60, 60);
      let col = color(hue(base.col), saturation(base.col), brightness(base.col), 0.4);
      fillerLatents.push({ x, y, z, col });
    }
  }
}

function drawFullLatentSpace() {
  // Echte 9 Datenpunkte
  for (let pt of staticLatents) {
    push();
    translate(pt.x, pt.y, pt.z);
    fill(pt.col);
    noStroke();
    sphere(10);
    pop();
  }

  // Nur zeigen, wenn nicht "verdichtet"
  if (!condensed) {
    for (let pt of fillerLatents) {
      push();
      translate(pt.x, pt.y, pt.z);
      fill(pt.col);
      noStroke();
      sphere(3);
      pop();
    }
  }
    // Zeichne die Clusterpunkte nur wenn NICHT condensed
  if (!condensed) {
    for (let i = 0; i < fillerLatents.length; i++) {
      let p = fillerLatents[i];
      push();
      translate(p.x, p.y, p.z);
      fill(p.col);
      noStroke();
      sphere(3);
      pop();
    }
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

function drawReconstructionScene() {
  if (dragPoints.length === 0) {
    for (let i = 0; i < latentPoints.length; i++) {
      dragPoints.push({
        x: random(-300, 300),
        y: random(-200, 200),
        col: latentPoints[i].col,
        fixed: false
      });
    }
  }

  for (let i = 0; i < dragPoints.length; i++) {
    let p = dragPoints[i];
    fill(p.col);
    noStroke();
    ellipse(p.x, p.y, 20);
  }

  stroke(180, 30, 80);
  strokeWeight(2);
  noFill();
  beginShape();
  for (let p of dragPoints) vertex(p.x, p.y);
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
  if (state === "reconstruct") {
    for (let p of dragPoints) {
      if (dist(mouseX - width / 2, mouseY - height / 2, p.x, p.y) < 10) {
        p.fixed = true;
      }
    }
  } else if (state === "zoom110") {
    // Check if mouse is over one of the epsilon sliders
      overSlider =
        isMouseOverSlider(epsilonXSlider) ||
        isMouseOverSlider(epsilonYSlider) ||
        isMouseOverSlider(epsilonZSlider);
    } else {
      handleClick(mouseX - width / 2, mouseY - height / 2);
    }
}

function mouseDragged() {
  if (state === "reconstruct") {
    for (let p of dragPoints) {
      if (p.fixed) {
        p.x = mouseX - width / 2;
        p.y = mouseY - height / 2;
      }
    }
  }
  // no changes here for sliders
}

function mouseReleased() {
  if (state === "reconstruct") {
    for (let p of dragPoints) p.fixed = false;
  }
  // Reset after any interaction
  overSlider = false;
}


function touchStarted() {
  if (touches.length > 0) {
    handleClick(touches[0].x - width / 2, touches[0].y - height / 2);
  }
  return false;
}
