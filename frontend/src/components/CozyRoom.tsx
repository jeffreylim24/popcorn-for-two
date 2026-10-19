import './CozyRoom.css'

/**
 * A point in the isometric scene: x runs to the lower right, y to the lower
 * left, z up. One unit is one floor tile.
 */
type Point3 = [number, number, number]

/** SVG pixels per scene unit. */
const UNIT = 12
/** The floor's side, in tiles. */
const ROOM = 12
const WALL_HEIGHT = 7
const WALL_THICKNESS = 0.4

/** Projects a scene point to 2D SVG coordinates (2:1 isometric). */
function iso([x, y, z]: Point3): [number, number] {
  return [(x - y) * UNIT, (x + y) * (UNIT / 2) - z * UNIT]
}

/** An SVG `points` string through the given scene points. */
function poly(points: Point3[]) {
  return points.map((p) => iso(p).join(',')).join(' ')
}

/** Scales a `#rrggbb` colour by `factor` (< 1 darkens), as `rgb()`. */
function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16)
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * factor)
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}

/**
 * One flat face. The same-colour stroke hides hairline seams between
 * neighbouring faces.
 */
function Face({ points, fill }: { points: Point3[]; fill: string }) {
  return (
    <polygon
      points={poly(points)}
      fill={fill}
      stroke={fill}
      strokeWidth={0.4}
      strokeLinejoin="round"
    />
  )
}

type BoxProps = {
  at: Point3
  size: Point3
  color: string
  top?: string
  left?: string
  right?: string
}

/**
 * A shaded box. Draws only the three faces the camera can see: +y (lower
 * left), +x (lower right), top.
 */
function Box({
  at: [x, y, z],
  size: [w, d, h],
  color,
  top = color,
  left = shade(color, 0.86),
  right = shade(color, 0.72),
}: BoxProps) {
  return (
    <g>
      <Face
        points={[
          [x, y + d, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ]}
        fill={left}
      />
      <Face
        points={[
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x + w, y, z + h],
        ]}
        fill={right}
      />
      <Face
        points={[
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ]}
        fill={top}
      />
    </g>
  )
}

const COLORS = {
  wall: '#fdf1dd',
  wallCap: '#fffaf2',
  floor: '#e8c595',
  wood: '#b9824f',
  grass: '#a8cf87',
  dirt: '#8a5a3b',
  couch: '#93b79d',
  rug: '#f4c6b2',
  tv: '#2c2830',
  accent: '#e07a4f',
}

function Island() {
  return (
    <>
      <ellipse cx={0} cy={110} rx={200} ry={70} fill="#5fae9f" opacity={0.35} />
      <Box
        at={[-1.4, -1.4, -2.4]}
        size={[14.8, 14.8, 1.5]}
        color={COLORS.dirt}
      />
      <Box
        at={[-1.4, -1.4, -0.9]}
        size={[14.8, 14.8, 0.3]}
        color="#7fae62"
        top={COLORS.grass}
      />
      <Box at={[0, 0, -0.6]} size={[ROOM, ROOM, 0.6]} color={COLORS.floor} />
      {Array.from({ length: ROOM - 1 }, (_, i) => {
        const [x1, y1] = iso([0, i + 1, 0])
        const [x2, y2] = iso([ROOM, i + 1, 0])
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={shade(COLORS.floor, 0.9)}
            strokeWidth={0.6}
          />
        )
      })}
    </>
  )
}

function Walls() {
  const lightXs = Array.from({ length: 12 }, (_, i) => 0.5 + i)
  const sag = (x: number) => 6.6 - 0.35 * Math.sin(Math.PI * ((x % 3) / 3))
  const wire = Array.from({ length: 47 }, (_, i) => 0.25 + i * 0.25)
    .map((x) => iso([x, 0.05, sag(x)]).join(','))
    .join(' ')

  return (
    <>
      <Box
        at={[-WALL_THICKNESS, -WALL_THICKNESS, -0.6]}
        size={[ROOM + WALL_THICKNESS, WALL_THICKNESS, WALL_HEIGHT + 0.6]}
        color={COLORS.wall}
        top={COLORS.wallCap}
        left="#f7e9d3"
      />
      <Box
        at={[-WALL_THICKNESS, 0, -0.6]}
        size={[WALL_THICKNESS, ROOM, WALL_HEIGHT + 0.6]}
        color={COLORS.wall}
        top={COLORS.wallCap}
        right="#ecd7ba"
      />
      <Box at={[0, 0, 0]} size={[ROOM, 0.12, 0.4]} color={COLORS.wood} />
      <Box at={[0, 0, 0]} size={[0.12, ROOM, 0.4]} color={COLORS.wood} />

      {/* String lights along the back wall */}
      <polyline points={wire} fill="none" stroke="#6b5444" strokeWidth={0.6} />
      {lightXs.map((x, i) => {
        const [cx, cy] = iso([x, 0.05, sag(x) - 0.1])
        return (
          <circle
            key={x}
            className="cozy-twinkle"
            style={{ animationDelay: `${(i % 4) * 0.6}s` }}
            cx={cx}
            cy={cy}
            r={1.8}
            fill={['#ffd36e', '#ff9f6e', '#ffe9a8', '#ffb3a1'][i % 4]}
          />
        )
      })}
    </>
  )
}

function Window() {
  const sky: Point3[] = [
    [0.02, 3.3, 2.9],
    [0.02, 6.7, 2.9],
    [0.02, 6.7, 5.1],
    [0.02, 3.3, 5.1],
  ]
  const [sunX, sunY] = iso([0, 4.3, 4.4])
  const [cloudX, cloudY] = iso([0, 5.6, 4.6])
  const line = (a: Point3, b: Point3) => {
    const [x1, y1] = iso(a)
    const [x2, y2] = iso(b)
    return { x1, y1, x2, y2 }
  }

  return (
    <>
      <defs>
        <clipPath id="cozy-window">
          <polygon points={poly(sky)} />
        </clipPath>
        <linearGradient id="cozy-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9b98f" />
          <stop offset="100%" stopColor="#fde3c0" />
        </linearGradient>
      </defs>
      <Face
        points={[
          [0.02, 3, 2.6],
          [0.02, 7, 2.6],
          [0.02, 7, 5.4],
          [0.02, 3, 5.4],
        ]}
        fill={COLORS.wood}
      />
      <polygon points={poly(sky)} fill="url(#cozy-sky)" />
      <g clipPath="url(#cozy-window)">
        <circle cx={sunX} cy={sunY} r={6} fill="#ffcf6b" />
        <g className="cozy-cloud">
          <ellipse cx={cloudX} cy={cloudY} rx={7} ry={3} fill="#fff6ec" />
          <ellipse
            cx={cloudX + 5}
            cy={cloudY - 2}
            rx={5}
            ry={3}
            fill="#fff6ec"
          />
        </g>
      </g>
      <line
        {...line([0.02, 5, 2.9], [0.02, 5, 5.1])}
        stroke={COLORS.wood}
        strokeWidth={1.4}
      />
      <line
        {...line([0.02, 3.3, 4], [0.02, 6.7, 4])}
        stroke={COLORS.wood}
        strokeWidth={1.4}
      />
      <Box at={[0, 2.9, 2.45]} size={[0.5, 4.2, 0.15]} color={COLORS.wood} />
    </>
  )
}

function BackWallDecor() {
  const [popX, popY] = iso([2.4, 0.02, 3.8])
  const books = [
    { x: 8.9, h: 0.9, color: '#e07a4f' },
    { x: 9.3, h: 1.1, color: '#7aa6c2' },
    { x: 9.7, h: 0.8, color: '#f2c14e' },
    { x: 10.1, h: 1.0, color: '#93b79d' },
  ]

  return (
    <>
      {/* Movie poster */}
      <Face
        points={[
          [1.4, 0.02, 2.8],
          [3.4, 0.02, 2.8],
          [3.4, 0.02, 4.8],
          [1.4, 0.02, 4.8],
        ]}
        fill="#4a3a32"
      />
      <Face
        points={[
          [1.6, 0.02, 3],
          [3.2, 0.02, 3],
          [3.2, 0.02, 4.6],
          [1.6, 0.02, 4.6],
        ]}
        fill={COLORS.accent}
      />
      <circle cx={popX} cy={popY} r={4} fill="#fff1cf" />
      <circle cx={popX - 3} cy={popY + 2} r={3} fill="#fff1cf" />
      <circle cx={popX + 3} cy={popY + 2} r={3} fill="#fff1cf" />

      {/* Shelf with books */}
      <Box at={[8.6, 0, 4.6]} size={[2.6, 0.9, 0.25]} color={COLORS.wood} />
      {books.map((b) => (
        <Box
          key={b.x}
          at={[b.x, 0.15, 4.85]}
          size={[0.35, 0.6, b.h]}
          color={b.color}
        />
      ))}
      <Box
        at={[10.6, 0.2, 4.85]}
        size={[0.45, 0.45, 0.4]}
        color={COLORS.accent}
      />
    </>
  )
}

function Plant() {
  const [x, y] = iso([1.1, 1.9, 1])
  return (
    <>
      <Box at={[0.6, 1.4, 0]} size={[1, 1, 1]} color="#c9693f" />
      <g className="cozy-sway">
        <ellipse
          cx={x - 6}
          cy={y - 8}
          rx={3}
          ry={8}
          fill="#5f9a5a"
          transform={`rotate(-30 ${x - 6} ${y - 8})`}
        />
        <ellipse
          cx={x + 6}
          cy={y - 8}
          rx={3}
          ry={8}
          fill="#5f9a5a"
          transform={`rotate(30 ${x + 6} ${y - 8})`}
        />
        <ellipse cx={x} cy={y - 11} rx={3.5} ry={10} fill="#73b06b" />
        <ellipse
          cx={x - 3}
          cy={y - 5}
          rx={2.5}
          ry={6}
          fill="#73b06b"
          transform={`rotate(-55 ${x - 3} ${y - 5})`}
        />
        <ellipse
          cx={x + 3}
          cy={y - 5}
          rx={2.5}
          ry={6}
          fill="#73b06b"
          transform={`rotate(55 ${x + 3} ${y - 5})`}
        />
      </g>
    </>
  )
}

function Rug() {
  return (
    <>
      <Box at={[2.4, 3.2, 0]} size={[7.4, 7, 0.06]} color={COLORS.rug} />
      <polygon
        points={poly([
          [2.9, 3.7, 0.07],
          [9.3, 3.7, 0.07],
          [9.3, 9.7, 0.07],
          [2.9, 9.7, 0.07],
        ])}
        fill="none"
        stroke="#fbe3d6"
        strokeWidth={1.2}
      />
    </>
  )
}

function Tv() {
  const screen: Point3[] = [
    [4.6, 0.82, 1.65],
    [7.4, 0.82, 1.65],
    [7.4, 0.82, 3.8],
    [4.6, 0.82, 3.8],
  ]
  const glow: Point3[] = [
    [3.6, 1.5, 0.02],
    [8.4, 1.5, 0.02],
    [9.4, 5.5, 0.02],
    [2.6, 5.5, 0.02],
  ]

  return (
    <>
      <polygon className="cozy-tv-glow" points={poly(glow)} />
      <Box at={[3.8, 0.3, 0]} size={[4.4, 1.2, 1.4]} color={COLORS.wood} />
      <Box at={[4.3, 1.5, 0.35]} size={[1.4, 0.01, 0.7]} color="#a06f42" />
      <Box at={[6.3, 1.5, 0.35]} size={[1.4, 0.01, 0.7]} color="#a06f42" />
      <Box at={[4.4, 0.55, 1.4]} size={[3.2, 0.25, 2.6]} color={COLORS.tv} />
      <polygon className="cozy-tv-screen" points={poly(screen)} />
      <polygon
        points={poly([
          [4.8, 0.83, 3.6],
          [5.6, 0.83, 3.6],
          [4.8, 0.83, 3.0],
        ])}
        fill="#fff"
        opacity={0.25}
      />
    </>
  )
}

function Cat() {
  const [x, y] = iso([10.2, 10.4, 0.25])
  return (
    <g>
      <path
        className="cozy-tail"
        d={`M ${x + 6} ${y + 1} q 8 -1 7 -7`}
        fill="none"
        stroke="#e39a5b"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <ellipse cx={x} cy={y} rx={8} ry={4.5} fill="#e9a464" />
      <circle cx={x - 7} cy={y - 2} r={3.8} fill="#e9a464" />
      <path d={`M ${x - 10} ${y - 4} l 1 -4 l 2.5 2.5 z`} fill="#e9a464" />
      <path d={`M ${x - 6.5} ${y - 5} l 1.5 -3.5 l 1.5 3.5 z`} fill="#e9a464" />
      <path
        d={`M ${x - 3} ${y - 3} q 3 2 6 0`}
        stroke="#c97f45"
        strokeWidth={0.8}
        fill="none"
      />
    </g>
  )
}

function CoffeeTable() {
  const legs: Point3[] = [
    [5.1, 4.3, 0],
    [7.1, 4.3, 0],
    [5.1, 5.1, 0],
    [7.1, 5.1, 0],
  ]
  const [bowlX, bowlY] = iso([5.75, 4.8, 1.35])
  const steam = [iso([6.75, 4.65, 1.3]), iso([6.75, 5.1, 1.3])]

  return (
    <>
      {legs.map((at) => (
        <Box key={at.join()} at={at} size={[0.2, 0.2, 0.6]} color="#8f6038" />
      ))}
      <Box at={[5, 4.2, 0.6]} size={[2.4, 1.2, 0.25]} color={COLORS.wood} />

      {/* Popcorn bowl */}
      <Box at={[5.3, 4.45, 0.85]} size={[0.9, 0.7, 0.5]} color="#d9534f" />
      <circle cx={bowlX - 4} cy={bowlY} r={2.6} fill="#fff3d1" />
      <circle cx={bowlX} cy={bowlY - 2} r={2.8} fill="#ffe7a8" />
      <circle cx={bowlX + 4} cy={bowlY} r={2.6} fill="#fff3d1" />
      <circle cx={bowlX} cy={bowlY + 1.5} r={2.4} fill="#fff3d1" />
      <circle
        className="cozy-pop"
        cx={bowlX + 2}
        cy={bowlY - 4}
        r={1.6}
        fill="#fff3d1"
      />

      {/* Two mugs */}
      <Box at={[6.6, 4.5, 0.85]} size={[0.3, 0.3, 0.4]} color="#f7f1e6" />
      <Box at={[6.6, 4.95, 0.85]} size={[0.3, 0.3, 0.4]} color="#7aa6c2" />
      {steam.map(([sx, sy], i) => (
        <path
          key={i}
          className="cozy-steam"
          style={{ animationDelay: `${i * 1.2}s` }}
          d={`M ${sx} ${sy} q -2 -3 0 -6 t 0 -6`}
          fill="none"
          stroke="#fff"
          strokeWidth={1}
          strokeLinecap="round"
        />
      ))}
    </>
  )
}

type PersonProps = { at: Point3; hair: string; shirt: string; bun?: boolean }

function Person({ at, hair, shirt, bun = false }: PersonProps) {
  const [x, y] = iso(at)
  return (
    <g>
      <ellipse cx={x} cy={y + 9} rx={8} ry={5} fill={shirt} />
      <circle cx={x} cy={y} r={6.5} fill={hair} />
      {bun && <circle cx={x + 1} cy={y - 7} r={3} fill={hair} />}
    </g>
  )
}

function Couch() {
  const [heartX, heartY] = iso([6, 7.3, 3.8])
  return (
    <>
      <Box at={[3, 6.4, 0]} size={[0.6, 2.2, 1.9]} color={COLORS.couch} />
      <Box at={[3.4, 6.6, 0]} size={[5.2, 1.6, 1]} color={COLORS.couch} />
      <Box at={[3.8, 6.6, 1]} size={[2.2, 1.4, 0.35]} color="#a7c8af" />
      <Box at={[6, 6.6, 1]} size={[2.2, 1.4, 0.35]} color="#a7c8af" />
      <Person at={[5.1, 7.3, 2.9]} hair="#5a3d2e" shirt="#e07a4f" bun />
      <Person at={[6.9, 7.3, 2.9]} hair="#2f2520" shirt="#7aa6c2" />
      <path
        className="cozy-heart"
        d={`M ${heartX} ${heartY + 3} l -3.5 -3.5 a 2 2 0 0 1 3.5 -2.5 a 2 2 0 0 1 3.5 2.5 z`}
        fill="#ef6f6c"
      />
      <Box at={[8.4, 6.4, 0]} size={[0.6, 2.2, 1.9]} color={COLORS.couch} />
      <Box at={[3, 8, 0]} size={[6, 0.8, 2.6]} color={COLORS.couch} />
    </>
  )
}

function Lamp() {
  const [baseX, baseY] = iso([11.3, 2.6, 0])
  const [poleX, poleY] = iso([11.3, 2.6, 3.4])
  const [glowX, glowY] = iso([11.3, 2.6, 3.8])
  return (
    <>
      <defs>
        <radialGradient id="cozy-lamp">
          <stop offset="0%" stopColor="#ffe3a3" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#ffe3a3" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle
        className="cozy-lamp-glow"
        cx={glowX}
        cy={glowY}
        r={42}
        fill="url(#cozy-lamp)"
      />
      <ellipse cx={baseX} cy={baseY} rx={5} ry={2.5} fill="#5c4637" />
      <line
        x1={baseX}
        y1={baseY}
        x2={poleX}
        y2={poleY}
        stroke="#5c4637"
        strokeWidth={1.4}
      />
      <Box at={[10.7, 2, 3.3]} size={[1.2, 1.2, 0.9]} color="#ffd98a" />
    </>
  )
}

function Water() {
  const ripples = [
    [-200, 60],
    [150, 40],
    [-120, 190],
    [180, 170],
    [-230, 130],
    [90, 205],
  ]
  return (
    <>
      <defs>
        <radialGradient id="cozy-water" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ccabd" />
          <stop offset="70%" stopColor="#a6dccf" />
          <stop offset="100%" stopColor="#a6dccf" stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={0} cy={100} rx={258} ry={118} fill="url(#cozy-water)" />
      {ripples.map(([x, y], i) => (
        <path
          key={i}
          className="cozy-ripple"
          style={{ animationDelay: `${i * 0.7}s` }}
          d={`M ${x} ${y} q 6 -3 12 0 t 12 0 t 12 0`}
          fill="none"
          stroke="#fff"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}
      <g className="cozy-bob">
        <ellipse cx={-190} cy={150} rx={9} ry={5.5} fill="#ffd54a" />
        <circle cx={-196} cy={142} r={4.5} fill="#ffd54a" />
        <path d="M -200 142 l -4 1 l 4 1.5 z" fill="#f08a3c" />
        <circle cx={-197} cy={141} r={0.8} fill="#2f2520" />
      </g>
    </>
  )
}

/** Decorative hero: a couple's living room on a little island, mid movie night. */
export function CozyRoom({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-260 -100 520 320"
      className={className}
      role="img"
      aria-label="A cozy little room on an island: two people on a couch watching a glowing TV, with popcorn on the table"
    >
      <Water />
      <g className="cozy-float">
        <Island />
        <Walls />
        <Window />
        <BackWallDecor />
        <Plant />
        <Rug />
        <Tv />
        <CoffeeTable />
        <Couch />
        <Lamp />
        <Cat />
      </g>
    </svg>
  )
}
