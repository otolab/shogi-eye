const CV_PI = Math.PI
const SCALES = [1, 160]


function rotateLines(lines) {
  const rotated = []
  for( let line of lines ) {
    const [p1x, p1y, p2x, p2y] = line
    if (p1y < p2y) {
      rotated.push([p1y, p1x, p2y, p2x])
    }
    else {
      rotated.push([p2y, p2x, p1y, p1x])
    }
  }
  return rotated
}


// rho / thetaの形式に変換
function convLinesToRhoTheta(lines) {
  const rtLines = []

  for( let line of lines ) {
    const [p1x, p1y, p2x, p2y] = line
    const x = p1x - p2x;
    const y = p1y - p2y;
    const a = -y / Math.sqrt(x*x + y*y)

    const theta = Math.acos(a)
    const rho = Math.abs(Math.cos(theta)*p1x + Math.sin(theta)*p1y);

    rtLines.push([rho, theta])
  }

  // console.log(lines, rtLines)
  return rtLines
}


function classifyAndScale(rtLines) {
  const holizonalLines = []
  const verticalLines = []

  for (let line of rtLines) {
    let [rho, theta] = line

    const holizonal = theta > (CV_PI/4) && theta < (3*CV_PI/4)

    if(!holizonal) {
      if (theta > CV_PI/2 ){
        theta = theta - CV_PI;
      }

      theta = theta + CV_PI/2
    }


    const _line = {x: rho * SCALES[0], y: theta * SCALES[1]}

    if (holizonal) holizonalLines.push(_line);
    else verticalLines.push(_line)
  }

  return {holizonalLines, verticalLines}
}


function _solveQuations(a) {
  const answers = []
  let x = [];
 
  for (let i=0; i<2;i++) {
    let m = 0;
    let pivot = i;

    for (let l=i; l<2; l++) {
      /*i列の中で一番値が大きい行を選ぶ*/
      if (Math.abs(a[l][i]) > m) {
        m = Math.abs(a[l][i]);
        pivot = l;
      }
    }

    /*pivotがiと違えば、行の入れ替え*/
    if (pivot != i) {  
      const b = [[]];
      for (let j=0; j<3; j++) {
        b[0][j] = a[i][j];        
        a[i][j] = a[pivot][j];
        a[pivot][j] = b[0][j];
      }
    }
  }

  for (let k=0; k<2; k++) {
    const p = a[k][k]; //対角要素を保存
    /*対角要素は1になることがわかっているので直接代入*/
    a[k][k] = 1;      

    for (let j=k+1; j<3; j++) {
      a[k][j] /= p;
    }

    for (let i=k+1; i<2; i++) {
      const q = a[i][k];

      for (let j=k+1; j<3; j++) {
        a[i][j] -= q * a[k][j];
      }
      /*0となることがわかっているので直接代入*/
      a[i][k] = 0;
    }
  }

  /*解の計算*/
  for (let i=1; i>=0; i--) {
    x[i] = a[i][2];
    for (let j=1; j>i; j--) {
      x[i] -= a[i][j] * x[j];
    }
  }

  for (let i=0; i<2; i++) {
    answers[i] = x[i];
  }

  return answers
}


// 仮説をたてる    (Hypothesis Stage)
function _hypothesisStage(points, tryCount, threshold) {
  const a = [
    [[], [], []],
    [[], [], []]
  ]
  let probA=0, probB=0, score=0;
  const sampleCount = points.length

  if (sampleCount <= 0) return {probA: 0, probB: 0};

  for (var i=0; i<tryCount; i++) {
    const rand1 = Math.floor(Math.random() * sampleCount);
    const rand2 = Math.floor(Math.random() * sampleCount);

    const samplePointA = points[rand1];
    const samplePointB = points[rand2];
    
    //pointA.x *a + 1*b=pointA.y
    a[0][0] = samplePointA.x;
    a[0][1] = 1;
    a[0][2] = samplePointA.y;

    a[1][0] = samplePointB.x;
    a[1][1] = 1;
    a[1][2] = samplePointB.y;

    //連立方程式を解く solve equations
    const answers = _solveQuations(a);

    let localScore=0;

    let samplePoint;
    for (let j=0; j<sampleCount; j++) {
      samplePoint = points[j];
      const calcY = answers[0] * samplePoint.x + answers[1];
      // if(samplePoint.y!=0) {
      if (Math.abs(calcY-samplePoint.y) < threshold) {
        localScore++;
      }
      // }
    }

    if (localScore > score) {
      //仮パラメータとスコアを更新
      score = localScore;
      probA = answers[0];
      probB = answers[1];
    }
  }
  // console.log(`max score: ${score}`);
  // console.log(`probe: ${probA} / ${probB}`);

  return {probA, probB}
}


//from http://hooktail.sub.jp/computPhys/least-square/index.html
function leastSquare(points, num){
  let sum_xy = 0, sum_x = 0, sum_y = 0, sum_x2 = 0;

  for (let i=0; i<num; i++){
    sum_xy += points[i].x * points[i].y;
    sum_x += points[i].x;
    sum_y += points[i].y;
    sum_x2 += Math.pow(points[i].x, 2);
  }

  const a = (num * sum_xy - sum_x * sum_y) / (num * sum_x2 - Math.pow(sum_x, 2));
  const b = (sum_x2 * sum_y - sum_xy * sum_x) / (num * sum_x2 - Math.pow(sum_x, 2));

  return {a, b}
}

  //////////////////////////////////////
  //仮説の検証   (Verification Stage)
  //////////////////////////////////////
function _verificationStage(points, probA, probB, threshold) {
  const sampleCount = points.length

  //正解の点のリストを作成する
  const inliers = []

  for(let j=0; j<sampleCount; j++){
    const {x, y} = points[j]
    const calcY = probA * x + probB;
    if(Math.abs(calcY-y) < threshold) {
      //正解の値のみ、リストに追加
      inliers.push({x, y})
    }
  }

  // console.log(`inlier points: ${inliers.length} / ${sampleCount}`)

  const {a, b} = leastSquare(inliers, inliers.length)

  // console.log(`RANSAC: ${a} / ${b}`);

  return {a, b}
}


function RANSAC_y_Ax_B(points, params={}) {
  const {
    tryCount = 100,
    hypothesisThreshold = 1,
    verificationThreshold = 0.5
  } = params
  const {probA, probB} = _hypothesisStage(points, tryCount, hypothesisThreshold)
  const {a, b} = _verificationStage(points, probA ,probB, verificationThreshold)

  return {a, b, probA, probB}
}


function convABToLine(a, b, offset, line_lim) {
  const line = [
    -line_lim+offset.x,
    -line_lim*a+b+offset.y,
    line_lim+offset.x,
    line_lim*a+b+offset.y
  ]
  return line
}


function findCross(p, q)
{
  const det = p.a * q.b - q.a * p.b;
  if (det == 0) return {t: true};

  const x = (p.b * q.c - q.b * p.c) / det;
  const y = (q.a * p.c - p.a * q.c) / det;
  return {t: false, x, y};
}


function calcVanishingPoint(rho1, theta1, rho2, theta2) {
  // if (theta1 < 0) theta1 += CV_PI;
  // if (theta2 < 0) theta2 += CV_PI;

  const l1 = {}, l2 = {};
  let l1x0, l1y0, l2x0, l2y0;
  l1x0 = rho1 * Math.cos(theta1);
  l1y0 = rho1 * Math.sin(theta1);
  l1.a = l1x0;
  l1.b = l1y0;
  l1.c = - (l1x0*l1x0) - (l1y0*l1y0);

  l2x0 = rho2 * Math.cos(theta2);
  l2y0 = rho2 * Math.sin(theta2);
  l2.a = l2x0;
  l2.b = l2y0;
  l2.c = - (l2x0*l2x0) - (l2y0*l2y0);

  const {x, y} = findCross(l1, l2);
  // if (t) console.log("bad\n");
  return {x: -x, y};
}


function _detectVanishingPoint(lines, params) {
  const rtLines = convLinesToRhoTheta(lines)
  const {holizonalLines} = classifyAndScale(rtLines)

  const {a, b, probA, probB} = RANSAC_y_Ax_B(holizonalLines, params)
  const line_lim = 400
  const probLine = convABToLine(probA, probB, {x: 0, y: 0}, line_lim)
  const ransacLine = convABToLine(a, b, {x: 0, y: 0}, line_lim)
  const vanishingPoint = calcVanishingPoint(
    ransacLine[0]/SCALES[0],
    ransacLine[1]/SCALES[1],
    ransacLine[2]/SCALES[0],
    ransacLine[3]/SCALES[1])

  return {
    holizonalLines,
    probLine,
    ransacLine,
    vanishingPoint
  }
}


export function detectVanishingPoint(lines, params) {
  let probLineH, probLineV, ransacLineH, ransacLineV, vanishingPointH, vanishingPointV
  let _holizonalLines, _verticalLines

  {
    const {holizonalLines, probLine, ransacLine, vanishingPoint} = _detectVanishingPoint(lines, params)
    _holizonalLines = holizonalLines
    probLineH = probLine
    ransacLineH = ransacLine
    vanishingPointH = vanishingPoint
  }

  {
    lines = rotateLines(lines)
    const {holizonalLines, probLine, ransacLine, vanishingPoint} = _detectVanishingPoint(lines, params)
    _verticalLines = holizonalLines // rotateしているので
    probLineV = probLine
    ransacLineV = ransacLine
    const {x, y} = vanishingPoint
    vanishingPointV = {x: y, y: x}
  }

  return {
    holizonalLines: _holizonalLines,
    verticalLines: _verticalLines,
    probLineH,
    vanishingPointH,
    ransacLineH,
    probLineV,
    ransacLineV,
    vanishingPointV,
  }
}


