import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FONTS = [
  { name: 'PT Sans', data: readFileSync(path.join(__dirname, 'fonts/PTSans-Regular.ttf')), weight: 400, style: 'normal' },
  { name: 'PT Sans', data: readFileSync(path.join(__dirname, 'fonts/PTSans-Bold.ttf')), weight: 700, style: 'normal' },
];

const WIDTH = 1200;
const HEIGHT = 630;

const COLOR = {
  bg: '#f7f7f9',
  card: '#ffffff',
  primary: '#4f46e5',
  text: '#16161a',
  textSecondary: '#5f5e6b',
  success: '#0ca30c',
  error: '#d03b3b',
  border: 'rgba(22, 22, 26, 0.12)',
};

function h(type, props = {}, children) {
  return children === undefined ? { type, props } : { type, props: { ...props, children } };
}

async function renderPng(node) {
  const svg = await satori(node, { width: WIDTH, height: HEIGHT, fonts: FONTS });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
  return resvg.render().asPng();
}

function shell(children) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: WIDTH,
        height: HEIGHT,
        padding: 56,
        background: COLOR.bg,
        fontFamily: 'PT Sans',
      },
    },
    children
  );
}

function brandMark() {
  return h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 12 } }, [
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 11,
          marginRight: 12,
          background: COLOR.primary,
          color: '#ffffff',
          fontSize: 20,
          fontWeight: 700,
        },
      },
      'R'
    ),
    h('div', { style: { display: 'flex', fontSize: 20, fontWeight: 700, color: COLOR.textSecondary } }, 'Ratings'),
  ]);
}

function header(title, subtitle) {
  return h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', marginBottom: 20 } },
    [
      brandMark(),
      h('div', { style: { display: 'flex', fontSize: 38, fontWeight: 700, color: COLOR.text, letterSpacing: -1 } }, title),
      subtitle && h('div', { style: { display: 'flex', fontSize: 20, color: COLOR.textSecondary, marginTop: 6 } }, subtitle),
    ].filter(Boolean)
  );
}

function emptyCard(text) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        background: COLOR.card,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 20,
        fontSize: 24,
        color: COLOR.textSecondary,
      },
    },
    text
  );
}

function formBadge(letter, i, size = 26) {
  const color = letter === 'W' ? COLOR.success : letter === 'L' ? COLOR.error : COLOR.textSecondary;
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: size / 2,
        marginLeft: i === 0 ? 0 : 4,
        background: `${color}22`,
        color,
        fontSize: size * 0.5,
        fontWeight: 700,
      },
    },
    letter
  );
}

// Rows share a fixed-height card (630px tall canvas), so sizing scales down as
// more rows need to fit -- up to 10 rows must always stay legible and on-canvas.
function rowScale(count) {
  if (count <= 5) return { height: 62, badge: 34, label: 25, primary: 27, meta: 15, form: 26 };
  if (count <= 6) return { height: 54, badge: 32, label: 23, primary: 25, meta: 14, form: 24 };
  if (count <= 8) return { height: 42, badge: 28, label: 20, primary: 22, meta: 13, form: 21 };
  return { height: 33, badge: 24, label: 17, primary: 19, meta: 12, form: 18 };
}

// row: { badge?, label, form?, primary, primaryColor?, secondary? }
function rowLine(row, i, total, scale) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        height: scale.height,
        borderBottom: i < total - 1 ? `1px solid ${COLOR.border}` : 'none',
      },
    },
    [
      row.badge != null &&
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: scale.badge,
              height: scale.badge,
              borderRadius: scale.badge / 2,
              marginRight: 20,
              background: i < 3 ? `${COLOR.primary}22` : 'transparent',
              color: i < 3 ? COLOR.primary : COLOR.textSecondary,
              fontSize: scale.badge * 0.5,
              fontWeight: 700,
            },
          },
          String(row.badge)
        ),
      h('div', { style: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 } }, [
        h('div', { style: { display: 'flex', fontSize: scale.label, fontWeight: 700, color: COLOR.text } }, row.label),
      ]),
      row.form &&
        row.form.length > 0 &&
        h(
          'div',
          { style: { display: 'flex', marginRight: 24 } },
          row.form.map((letter, fi) => formBadge(letter, fi, scale.form))
        ),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
        [
          h('div', { style: { display: 'flex', fontSize: scale.primary, fontWeight: 700, color: row.primaryColor ?? COLOR.text } }, row.primary),
          row.secondary && h('div', { style: { display: 'flex', fontSize: scale.meta, color: COLOR.textSecondary, marginTop: 2 } }, row.secondary),
        ].filter(Boolean)
      ),
    ].filter(Boolean)
  );
}

function rowsCard(rows) {
  const scale = rowScale(rows.length);
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
        background: COLOR.card,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 20,
        padding: '0 32px',
      },
    },
    rows.map((row, i) => rowLine(row, i, rows.length, scale))
  );
}

// A ranked/table-style OG card: leaderboard standings, rating swings, recent matches.
export async function renderTableCardPng({ title, subtitle, rows, emptyText = 'No data yet' }) {
  return renderPng(shell([header(title, subtitle), rows.length ? rowsCard(rows) : emptyCard(emptyText)]));
}

function statTile(stat) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        background: COLOR.card,
        border: `1px solid ${COLOR.border}`,
        borderRadius: 20,
        padding: 24,
        marginLeft: stat.first ? 0 : 20,
      },
    },
    [
      h('div', { style: { display: 'flex', fontSize: 36, fontWeight: 700, color: stat.color ?? COLOR.text } }, String(stat.value)),
      h('div', { style: { display: 'flex', fontSize: 16, color: COLOR.textSecondary, marginTop: 8 } }, stat.label),
    ]
  );
}

export const OG_COLORS = COLOR;

// A single-player OG card: name + a row of stat tiles.
export async function renderPlayerCardPng({ name, subtitle, stats }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return renderPng(
    shell([
      brandMark(),
      h('div', { style: { display: 'flex', alignItems: 'center', margin: '20px 0 40px' } }, [
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 116,
              height: 116,
              borderRadius: 58,
              marginRight: 32,
              background: `${COLOR.primary}22`,
              color: COLOR.primary,
              fontSize: 46,
              fontWeight: 700,
            },
          },
          initials
        ),
        h(
          'div',
          { style: { display: 'flex', flexDirection: 'column' } },
          [
            h('div', { style: { display: 'flex', fontSize: 48, fontWeight: 700, color: COLOR.text, letterSpacing: -1 } }, name),
            subtitle && h('div', { style: { display: 'flex', fontSize: 22, color: COLOR.textSecondary, marginTop: 8 } }, subtitle),
          ].filter(Boolean)
        ),
      ]),
      h(
        'div',
        { style: { display: 'flex', flex: 1 } },
        stats.map((s, i) => statTile({ ...s, first: i === 0 }))
      ),
    ])
  );
}
