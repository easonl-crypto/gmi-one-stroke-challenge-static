import { useEffect, useMemo, useRef, useState } from 'react';

const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`;
const LOGO_SRC = assetUrl('logo-mark.png');
const LOCKUP_SRC = assetUrl('gmi-lockup-white.png');
const QR_SRC = assetUrl('qr-code.jpg');
const DRAW_SIZE = 720;
const LOGO_CROP = { sx: 360, sy: 600, sw: 1460, sh: 960 };
const ACCENT_COLOR = '#DDEA4D';
const ACCENT_RGB = '221,234,77';

const targetPath = [
  [0.12, 0.48],
  [0.29, 0.48],
  [0.29, 0.37],
  [0.43, 0.37],
  [0.43, 0.25],
  [0.68, 0.25],
  [0.68, 0.37],
  [0.55, 0.37],
  [0.55, 0.48],
  [0.44, 0.48],
  [0.44, 0.59],
  [0.55, 0.59],
  [0.55, 0.72],
  [0.68, 0.72],
  [0.68, 0.82],
  [0.43, 0.82],
  [0.43, 0.72],
  [0.29, 0.72],
  [0.29, 0.59],
  [0.12, 0.59],
  [0.12, 0.48],
  [0.76, 0.48],
  [0.94, 0.48],
  [0.94, 0.59],
  [0.82, 0.59],
  [0.82, 0.72],
  [0.68, 0.72],
];

const initialMockScores = [
  32, 38, 41, 44, 48, 49, 52, 53, 55, 57, 59, 61, 62, 63, 65, 66, 68, 69,
  70, 71, 72, 74, 75, 76, 78, 79, 80, 81, 83, 84, 86, 88, 90, 92, 94,
];

export function App() {
  const canvasRef = useRef(null);
  const posterCanvasRef = useRef(null);
  const logoImageRef = useRef(null);
  const qrImageRef = useRef(null);
  const pointsRef = useRef([]);
  const startTimeRef = useRef(0);
  const [view, setView] = useState('challenge');
  const [phase, setPhase] = useState('intro');
  const [isDrawing, setIsDrawing] = useState(false);
  const [pointCount, setPointCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [logoReady, setLogoReady] = useState(false);

  const mockScores = useMemo(() => {
    const saved = window.localStorage.getItem('aicon_mock_scores');
    if (saved) return JSON.parse(saved);
    const scores = [...initialMockScores];
    for (let i = 0; i < 45; i += 1) {
      scores.push(Math.round(35 + Math.random() * 58));
    }
    window.localStorage.setItem('aicon_mock_scores', JSON.stringify(scores));
    return scores;
  }, []);

  useEffect(() => {
    const image = new Image();
    image.src = LOGO_SRC;
    image.onload = () => {
      logoImageRef.current = image;
      setLogoReady(true);
    };

    const qrImage = new Image();
    qrImage.src = QR_SRC;
    qrImage.onload = () => {
      qrImageRef.current = qrImage;
    };
  }, []);

  useEffect(() => {
    drawScene();
  }, [phase, view, logoReady, pointCount]);

  useEffect(() => {
    let timer;
    if (phase === 'drawing' && startTimeRef.current) {
      timer = window.setInterval(() => {
        setElapsedMs(performance.now() - startTimeRef.current);
      }, 80);
    }
    return () => window.clearInterval(timer);
  }, [phase]);

  function drawScene() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.setLineDash([]);
    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);
    paintBackground(ctx, width, height);

    if (phase === 'result') {
      drawCompletionLogo(ctx, width, height);
    } else {
      drawLogoGuide(ctx, width, height);
      drawLogoBrush(ctx, pointsRef.current, width, height);
    }
  }

  function startChallenge() {
    pointsRef.current = [];
    setPointCount(0);
    setPosterUrl('');
    setResult(null);
    setElapsedMs(0);
    startTimeRef.current = 0;
    setPhase('drawing');
    setView('challenge');
    window.requestAnimationFrame(drawScene);
  }

  function resetChallenge() {
    pointsRef.current = [];
    setPointCount(0);
    setPosterUrl('');
    setResult(null);
    setElapsedMs(0);
    startTimeRef.current = 0;
    setPhase('intro');
    setView('challenge');
    window.requestAnimationFrame(drawScene);
  }

  function getPoint(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    const source = event.touches?.[0] ?? event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * DRAW_SIZE,
      y: ((source.clientY - rect.top) / rect.height) * DRAW_SIZE,
      t: performance.now(),
    };
  }

  function handlePointerDown(event) {
    if (phase !== 'drawing' || pointsRef.current.length > 0) return;
    event.preventDefault();
    const point = getPoint(event);
    startTimeRef.current = performance.now();
    pointsRef.current = [point];
    setPointCount(1);
    setIsDrawing(true);
    drawScene();
  }

  function handlePointerMove(event) {
    if (!isDrawing || phase !== 'drawing') return;
    event.preventDefault();
    const point = getPoint(event);
    const last = pointsRef.current[pointsRef.current.length - 1];
    if (!last || distance(point, last) > 4) {
      pointsRef.current.push(point);
      setPointCount(pointsRef.current.length);
      drawScene();
    }
  }

  function handlePointerUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    setElapsedMs(performance.now() - startTimeRef.current);
    drawScene();
  }

  function finishChallenge() {
    if (pointsRef.current.length < 8) return;
    const finalElapsed = elapsedMs || performance.now() - startTimeRef.current;
    const nextResult = scoreAttempt(pointsRef.current, finalElapsed, mockScores);
    setResult(nextResult);
    setPhase('result');
    setView('result');
    saveAttempt(nextResult);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function createPoster() {
    if (!result) return;
    if (!qrImageRef.current?.complete) {
      const qrImage = new Image();
      qrImage.onload = () => {
        qrImageRef.current = qrImage;
        createPoster();
      };
      qrImage.src = QR_SRC;
      return;
    }

    const poster = posterCanvasRef.current;
    const ctx = poster.getContext('2d');
    const w = 1080;
    const h = 1440;
    poster.width = w;
    poster.height = h;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 58px Arial, "Microsoft YaHei", sans-serif';
    ctx.fillText('GMI Cloud Logo 鐒曟柊锛?, 52, 128);
    drawPosterLockup(ctx, 752, 72, 250, 56);

    ctx.font = '800 42px Arial, "Microsoft YaHei", sans-serif';
    ctx.fillText('鎴戠殑涓€绗旀寫鎴樺緱鍒?, 78, 224);
    ctx.font = '700 94px Arial, "Microsoft YaHei", sans-serif';
    ctx.fillText(`${result.total}`, 78, 318);
    ctx.fillText('鍒?, 78 + ctx.measureText(`${result.total}`).width + 10, 318);
    ctx.font = '500 34px Arial, "Microsoft YaHei", sans-serif';
    ctx.fillStyle = ACCENT_COLOR;
    ctx.fillText(`鎵撹触 ${result.beaten}% 鐨勬寫鎴樿€卄, 84, 372);

    drawPosterStat(ctx, 84, 410, '鐢ㄦ椂', `${result.time}s`);
    drawPosterStat(ctx, 384, 410, '瀵归綈搴?, `${result.alignment}%`);
    drawPosterStat(ctx, 684, 410, '閫熷害鍒?, `${result.speedScore}`);

    drawPosterCard(ctx, 64, 560, '鎴戠殑涓€绗?);
    drawPosterCard(ctx, 578, 560, 'GMI Cloud');
    drawPathIntoBox(ctx, pointsRef.current, 110, 690, 346, 280);
    drawPosterLogo(ctx, 628, 690, 330, 220);

    drawPosterQrBlock(ctx, qrImageRef.current);

    setPosterUrl(poster.toDataURL('image/png'));
  }

  const canFinish = phase === 'drawing' && pointCount > 8 && !isDrawing;

  return (
    <main className={`app-shell ${view === 'result' ? 'is-result-view' : ''}`}>
      <header className="brand-badge" aria-label="GMI logo">
        <img className="brand-lockup" src={LOCKUP_SRC} alt="GMI" />
      </header>
      <img className="logo-source-mark" src={LOGO_SRC} alt="" aria-hidden="true" />

      {view === 'challenge' ? (
        <section className="challenge-layout">
          <div className="copy-panel">
            <p className="eyebrow">ONE STROKE LOGO CHALLENGE</p>
            <h1 className="hero-title">
              <span className="hero-title-kicker">涓€绗旂敾鍑?/span>
              <span className="hero-title-brand">GMI Cloud</span>
            </h1>
            <div className="metrics-row" aria-live="polite">
              <div>
                <span>璁℃椂</span>
                <strong>{formatTime(elapsedMs)}</strong>
              </div>
              <div>
                <span>鐘舵€?/span>
                <strong>{phaseLabel(phase, isDrawing, pointCount)}</strong>
              </div>
            </div>
          </div>

          <div className="game-panel">
            <div className="canvas-frame">
              <canvas
                key="challenge-canvas"
                ref={canvasRef}
                className={`draw-canvas ${phase === 'drawing' && pointCount === 0 ? 'is-draw-ready' : ''} ${
                  isDrawing ? 'is-drawing' : ''
                }`}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                aria-label="logo drawing area"
              />
              {phase === 'intro' && (
                <button className="start-overlay" onClick={startChallenge}>
                  寮€濮嬫寫鎴?                </button>
              )}
              {phase === 'drawing' && pointCount === 0 && (
                <div className="hint-chip">娌跨潃 logo 鐧借壊涓讳綋涓€绗旂敾瀹?/div>
              )}
            </div>

            <div className="actions">
              <button onClick={startChallenge} disabled={phase === 'drawing' && pointCount === 0}>
                閲嶆柊寮€濮?              </button>
              <button className="primary" onClick={finishChallenge} disabled={!canFinish}>
                瀹屾垚鎸戞垬
              </button>
            </div>
          </div>
        </section>
      ) : (
        <ResultView
          canvasRef={canvasRef}
          result={result}
          posterUrl={posterUrl}
          onCreatePoster={createPoster}
          onRetry={resetChallenge}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      )}
      <canvas ref={posterCanvasRef} className="hidden-canvas" />
    </main>
  );
}

function ResultView({
  canvasRef,
  result,
  posterUrl,
  onCreatePoster,
  onRetry,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) {
  return (
    <section className="result-page">
      <div className="result-hero">
        <div>
          <p className="eyebrow">RESULT PAGE</p>
          <h1>鎸戞垬瀹屾垚</h1>
          <p className="lead">logo 宸叉樉鐜帮紝浣犵殑鐢ㄦ椂銆佸榻愬害鍜屾ā鎷熸帓琛屾鎴愮哗濡備笅銆?/p>
        </div>
        <div className="result-canvas-card">
            <canvas
              key="result-canvas"
              ref={canvasRef}
              className="draw-canvas"
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
            aria-label="logo result area"
          />
        </div>
        <aside className="result-panel result-panel-large">
          <p className="eyebrow">SCORE</p>
          <h2>{result.total}鍒?/h2>
          <p className="result-line">缁煎悎鍒?/p>
          <div className="score-grid">
            <div>
              <span>鐢ㄦ椂</span>
              <strong>{result.time}s</strong>
            </div>
            <div>
              <span>瀵归綈搴?/span>
              <strong>{result.alignment}%</strong>
            </div>
            <div>
              <span>閫熷害鍒?/span>
              <strong>{result.speedScore}</strong>
            </div>
            <div>
              <span>鎺掑悕</span>
              <strong>#{result.rank}</strong>
            </div>
            <div>
              <span>鎵撹触</span>
              <strong>{result.beaten}%</strong>
            </div>
          </div>
          <button className="share-button" onClick={onCreatePoster}>
            鍒嗕韩鎴戠殑鎴樼哗
          </button>
          <button className="ghost-button" onClick={onRetry}>
            鍐嶆潵涓€娆?          </button>
        </aside>
      </div>

      {posterUrl && (
        <div className="poster-modal">
          <div className="poster-copy">
            <p className="eyebrow">SHARE POSTER</p>
            <h2>浣犵殑鎸戞垬娴锋姤宸茬敓鎴?/h2>
          </div>
          <img className="poster-image" src={posterUrl} alt="GMI 涓€绗旀寫鎴樻捣鎶? />
          <button className="save-button">闀挎寜淇濆瓨娴锋姤</button>
        </div>
      )}
    </section>
  );
}

function paintBackground(ctx, width, height) {
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawLogoGuide(ctx, width, height) {
  const rect = getLogoRect(width, height);
  ctx.save();
  ctx.globalAlpha = 0.22;
  drawCroppedLogo(ctx, rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = `rgba(${ACCENT_RGB},0.72)`;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 11]);
  roundRect(ctx, rect.x - 12, rect.y - 12, rect.w + 24, rect.h + 24, 20);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCompletionLogo(ctx, width, height) {
  const rect = getLogoRect(width, height);
  ctx.save();
  ctx.shadowColor = ACCENT_COLOR;
  ctx.shadowBlur = 36;
  drawCroppedLogo(ctx, rect.x, rect.y, rect.w, rect.h);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.25;
  drawCroppedLogo(ctx, rect.x - 8, rect.y - 8, rect.w + 16, rect.h + 16);
  ctx.restore();
}

function drawCroppedLogo(ctx, x, y, width, height) {
  const image = document.querySelector('.logo-source-mark');
  if (!image?.complete) return;
  ctx.drawImage(
    image,
    LOGO_CROP.sx,
    LOGO_CROP.sy,
    LOGO_CROP.sw,
    LOGO_CROP.sh,
    x,
    y,
    width,
    height,
  );
}

function getLogoRect(width, height) {
  const w = width * 0.82;
  const h = w * (LOGO_CROP.sh / LOGO_CROP.sw);
  return {
    x: (width - w) / 2,
    y: (height - h) / 2,
    w,
    h,
  };
}

function drawLogoBrush(ctx, points, width, height) {
  if (points.length < 2) return;
  const mapped = points.map((point) => ({
    x: (point.x / DRAW_SIZE) * width,
    y: (point.y / DRAW_SIZE) * height,
  }));
  const strokeWidth = Math.max(36, width * 0.086);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = `rgba(${ACCENT_RGB},0.9)`;
  ctx.shadowBlur = 22;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = strokeWidth;
  drawPointPath(ctx, mapped);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.96)';
  ctx.lineWidth = strokeWidth * 0.76;
  drawPointPath(ctx, mapped);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  const stamp = strokeWidth * 0.54;
  const step = Math.max(12, strokeWidth * 0.38);
  for (const p of resamplePixelPath(mapped, Math.max(8, Math.round(pathLength(mapped) / step)))) {
    roundRect(ctx, p.x - stamp / 2, p.y - stamp / 2, stamp, stamp, stamp * 0.18);
    ctx.fill();
  }

  ctx.strokeStyle = `rgba(${ACCENT_RGB},0.82)`;
  ctx.lineWidth = 3;
  drawPointPath(ctx, mapped);
  ctx.stroke();
  ctx.restore();
}

function drawPointPath(ctx, points) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
}

function scoreAttempt(points, elapsedMs, mockScores) {
  const normalizedUser = points.map((p) => [p.x / DRAW_SIZE, p.y / DRAW_SIZE]);
  const userSample = resamplePath(normalizedUser, 180);
  const targetSample = resamplePath(targetPath, 180);
  const userToTargetDistances = userSample.map((point) => nearestDistance(point, targetSample));
  const targetToUserDistances = targetSample.map((point) => nearestDistance(point, userSample));
  const orderedDistance = averageDistance(userSample, targetSample);
  const endpointDistance = (
    distance(userSample[0], targetSample[0]) + distance(userSample.at(-1), targetSample.at(-1))
  ) / 2;
  const lengthRatio = clamp(pathLength(normalizedUser) / pathLength(targetPath), 0, 1.5);
  const looseOnPathRatio = ratioWithin(userToTargetDistances, 0.13);
  const looseCoverageRatio = ratioWithin(targetToUserDistances, 0.145);
  const tightOnPathRatio = ratioWithin(userToTargetDistances, 0.045);
  const tightCoverageRatio = ratioWithin(targetToUserDistances, 0.055);
  const progressFit = clamp(1 - orderedDistance / 0.3, 0, 1);
  const endpointFit = clamp(1 - endpointDistance / 0.32, 0, 1);
  const offPathFit = clamp(1 - percentile(userToTargetDistances, 0.9) / 0.2, 0, 1);
  const lengthFit = clamp(1 - Math.abs(1 - Math.min(lengthRatio, 1.18)) / 0.5, 0, 1);
  const coverageFit = (
    clamp((looseCoverageRatio - 0.12) / 0.62, 0, 1) * 0.5 +
    clamp((tightCoverageRatio - 0.05) / 0.55, 0, 1) * 0.5
  );
  const pathAdherenceFit = (
    clamp((looseOnPathRatio - 0.08) / 0.52, 0, 1) * 0.5 +
    clamp((tightOnPathRatio - 0.04) / 0.56, 0, 1) * 0.5
  );
  const drawingQuality = (
    coverageFit * 0.29 +
    pathAdherenceFit * 0.25 +
    progressFit * 0.18 +
    offPathFit * 0.15 +
    lengthFit * 0.08 +
    endpointFit * 0.05
  );
  const completionControl = coverageFit * 0.52 + pathAdherenceFit * 0.3 + lengthFit * 0.18;
  const alignment = Math.round(clamp(drawingQuality * 100, 8, 99));
  const speedScore = scoreSpeed(elapsedMs / 1000);
  const total = scoreTotal({
    alignment,
    speedScore,
    drawingQuality,
    completionControl,
    coverageFit,
    pathAdherenceFit,
    lengthFit,
  });
  const allScores = [...mockScores, total].sort((a, b) => b - a);
  const rank = allScores.indexOf(total) + 1;
  const beaten = Math.round(((allScores.length - rank) / (allScores.length - 1)) * 100);
  return {
    alignment,
    similarity: alignment,
    speedScore,
    total,
    rank,
    beaten,
    time: (elapsedMs / 1000).toFixed(2),
  };
}

function saveAttempt(result) {
  const history = JSON.parse(window.localStorage.getItem('aicon_attempts') || '[]');
  history.unshift({ ...result, createdAt: Date.now() });
  window.localStorage.setItem('aicon_attempts', JSON.stringify(history.slice(0, 20)));
}

function drawPosterCard(ctx, x, y, title) {
  ctx.fillStyle = '#171717';
  roundRect(ctx, x, y, 438, 560, 34);
  ctx.fill();
  ctx.strokeStyle = '#2f2f2f';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, 438, 560, 34);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px Arial, "Microsoft YaHei", sans-serif';
  ctx.fillText(title, x + 40, y + 68);
}

function drawPosterQrBlock(ctx, qrImage) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 43px Arial, "Microsoft YaHei UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('鏁笉鏁㈡潵璇曡瘯锛?, 335, 1266);
  ctx.textAlign = 'left';
  ctx.font = '58px "Segoe UI Emoji", "Apple Color Emoji", Arial, sans-serif';
  ctx.fillText('馃憠', 572, 1276);

  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 694, 1138, 252, 252, 26);
  ctx.fill();
  ctx.drawImage(qrImage, 710, 1154, 220, 220);
  ctx.restore();
}

function drawPosterLogo(ctx, x, y, width, height) {
  const image = document.querySelector('.logo-source-mark');
  if (!image?.complete) return;
  ctx.drawImage(
    image,
    LOGO_CROP.sx,
    LOGO_CROP.sy,
    LOGO_CROP.sw,
    LOGO_CROP.sh,
    x,
    y,
    width,
    height,
  );
}

function drawPosterLockup(ctx, x, y, width, height) {
  const image = document.querySelector('.brand-lockup');
  if (!image?.complete) return;
  ctx.drawImage(image, x, y, width, height);
}

function drawPathIntoBox(ctx, points, x, y, width, height) {
  if (points.length < 2) return;
  const bounds = points.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      maxX: Math.max(acc.maxX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const sourceW = Math.max(bounds.maxX - bounds.minX, 1);
  const sourceH = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = Math.min(width / sourceW, height / sourceH) * 0.82;
  const offsetX = x + (width - sourceW * scale) / 2;
  const offsetY = y + (height - sourceH * scale) / 2;
  const mapped = points.map((p) => ({
    x: offsetX + (p.x - bounds.minX) * scale,
    y: offsetY + (p.y - bounds.minY) * scale,
  }));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = `rgba(${ACCENT_RGB},0.55)`;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 42;
  drawPointPath(ctx, mapped);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (const p of resamplePixelPath(mapped, 24)) {
    roundRect(ctx, p.x - 14, p.y - 14, 28, 28, 6);
    ctx.fill();
  }
  ctx.restore();
}

function drawPosterStat(ctx, x, y, label, value) {
  ctx.fillStyle = '#272727';
  roundRect(ctx, x, y, 236, 118, 28);
  ctx.fill();
  ctx.fillStyle = '#9b9b9b';
  ctx.font = '500 28px Arial, "Microsoft YaHei", sans-serif';
  ctx.fillText(label, x + 28, y + 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px Arial, "Microsoft YaHei", sans-serif';
  ctx.fillText(value, x + 28, y + 92);
}

function resamplePath(points, count) {
  if (points.length <= 1) return points;
  const total = pathLength(points);
  if (!total) return points;
  const result = [points[0]];
  let segmentIndex = 1;
  let segmentStart = points[0];
  let segmentEnd = points[1];
  let segmentLength = distance(segmentStart, segmentEnd);
  let traversed = 0;
  for (let i = 1; i < count - 1; i += 1) {
    const target = (total * i) / (count - 1);
    while (traversed + segmentLength < target && segmentIndex < points.length - 1) {
      traversed += segmentLength;
      segmentIndex += 1;
      segmentStart = points[segmentIndex - 1];
      segmentEnd = points[segmentIndex];
      segmentLength = distance(segmentStart, segmentEnd);
    }
    const ratio = segmentLength ? (target - traversed) / segmentLength : 0;
    result.push([
      segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * ratio,
      segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * ratio,
    ]);
  }
  result.push(points.at(-1));
  return result;
}

function resamplePixelPath(points, count) {
  return resamplePath(
    points.map((p) => [p.x, p.y]),
    count,
  ).map(([x, y]) => ({ x, y }));
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

function nearestDistance(point, samples) {
  let nearest = Infinity;
  for (const sample of samples) {
    nearest = Math.min(nearest, distance(point, sample));
  }
  return nearest;
}

function averageDistance(points, targetPoints) {
  const count = Math.min(points.length, targetPoints.length);
  if (!count) return Infinity;
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    total += distance(points[i], targetPoints[i]);
  }
  return total / count;
}

function ratioWithin(values, limit) {
  if (!values.length) return 0;
  return values.filter((value) => value <= limit).length / values.length;
}

function percentile(values, ratio) {
  if (!values.length) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
}

function scoreTotal({
  speedScore,
  drawingQuality,
  completionControl,
  coverageFit,
  pathAdherenceFit,
  lengthFit,
}) {
  const rawScore = (
    drawingQuality * 0.74 +
    completionControl * 0.19 +
    (speedScore / 100) * 0.07
  );
  let total = 42 + (rawScore ** 1.85) * 57;

  if (lengthFit >= 0.35 && completionControl >= 0.24) {
    const effortFloor = 70 + completionControl * 9 + lengthFit * 5 + Math.min(coverageFit, pathAdherenceFit) * 3;
    total = Math.max(total, effortFloor);
  }

  if (lengthFit < 0.22 || (coverageFit < 0.12 && pathAdherenceFit < 0.12)) {
    total -= 10;
  } else if (coverageFit < 0.24 || pathAdherenceFit < 0.18 || lengthFit < 0.36) {
    total -= 5;
  }

  return Math.round(clamp(total, 42, 99));
}

function scoreSpeed(seconds) {
  if (seconds <= 2) return 100;
  if (seconds >= 20) return 0;
  const progress = clamp((20 - seconds) / 18, 0, 1);
  return Math.round((progress ** 0.85) * 100);
}

function distance(a, b) {
  return Math.hypot((a.x ?? a[0]) - (b.x ?? b[0]), (a.y ?? a[1]) - (b.y ?? b[1]));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function phaseLabel(phase, isDrawing, pointCount) {
  if (phase === 'intro') return '寰呭紑濮?;
  if (phase === 'result') return '宸茬粨绠?;
  if (!pointCount) return '寰呰捣绗?;
  return isDrawing ? '缁樺埗涓? : '鍙粨绠?;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapPosterText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split('');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const testLine = line + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

function drawCenteredPosterText(ctx, text, centerX, y, maxWidth, lineHeight) {
  const chars = text.split('');
  const lines = [];
  let line = '';
  for (const char of chars) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  ctx.save();
  ctx.textAlign = 'center';
  lines.forEach((item, index) => {
    ctx.fillText(item, centerX, y + index * lineHeight);
  });
  ctx.restore();
}
