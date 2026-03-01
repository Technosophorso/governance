import { useMemo, useState } from 'react';
import styles from '../styles/ContributorModal.module.css';

interface ContributorRepository {
  name: string;
  commits: number;
  contributions: number;
  pull_requests: number;
}

interface RepoDonutChartProps {
  repositories: ContributorRepository[];
}

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  start: number,
  end: number
): string {
  const largeArc = end - start > Math.PI ? 1 : 0;
  const oStart = polarToXY(cx, cy, outerR, start);
  const oEnd = polarToXY(cx, cy, outerR, end);
  const iStart = polarToXY(cx, cy, innerR, end);
  const iEnd = polarToXY(cx, cy, innerR, start);
  return [
    `M${oStart.x},${oStart.y}`,
    `A${outerR},${outerR} 0 ${largeArc} 1 ${oEnd.x},${oEnd.y}`,
    `L${iStart.x},${iStart.y}`,
    `A${innerR},${innerR} 0 ${largeArc} 0 ${iEnd.x},${iEnd.y}`,
    'Z',
  ].join(' ');
}

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = SIZE * 0.44;
const INNER_R = SIZE * 0.26;
const GAP = 0.025; // radians between slices
const HOVER_OFFSET = 6;

const RepoDonutChart: React.FC<RepoDonutChartProps> = ({ repositories }) => {
  const [active, setActive] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const sorted = [...repositories].sort((a, b) => b.contributions - a.contributions);
    const topRepos = sorted.slice(0, 12);
    const otherRepos = sorted.slice(12);
    const otherContributions = otherRepos.reduce((sum, r) => sum + r.contributions, 0);
    const otherCommits = otherRepos.reduce((sum, r) => sum + r.commits, 0);
    const otherPRs = otherRepos.reduce((sum, r) => sum + r.pull_requests, 0);

    return otherContributions > 0
      ? [
          ...topRepos,
          {
            name: 'Others',
            contributions: otherContributions,
            commits: otherCommits,
            pull_requests: otherPRs,
          },
        ]
      : topRepos;
  }, [repositories]);

  const total = useMemo(
    () => chartData.reduce((sum, r) => sum + r.contributions, 0),
    [chartData]
  );

  const slices = useMemo(() => {
    if (total === 0) return [];
    const count = chartData.length;
    const singleSlice = count === 1;
    const halfGap = singleSlice ? 0 : GAP / 2;
    let angle = -Math.PI / 2;

    return chartData.map((repo, i) => {
      const sweep = (repo.contributions / total) * Math.PI * 2;
      const start = angle + halfGap;
      const end = angle + sweep - halfGap;
      const mid = angle + sweep / 2;
      angle += sweep;

      // Graduate opacity: brightest for largest, fading for smallest
      const opacity = 0.95 - (i / Math.max(count - 1, 1)) * 0.55;

      return {
        key: repo.name,
        start,
        end,
        mid,
        fill: `rgba(255, 255, 255, ${opacity.toFixed(2)})`,
        hoverFill: `rgba(255, 255, 255, ${Math.min(opacity + 0.1, 1).toFixed(2)})`,
        legendBg: `rgba(255, 255, 255, ${opacity.toFixed(2)})`,
      };
    });
  }, [chartData, total]);

  return (
    <div className={styles.donutChartContainer}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.donutChart}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <filter id="repoSliceShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="rgba(0,0,0,0.45)" />
          </filter>
          <filter id="repoSliceShadowHover" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="5" floodColor="rgba(0,0,0,0.6)" />
          </filter>
        </defs>
        {slices.map(s => {
          const isActive = active === s.key;
          const tx = isActive ? Math.cos(s.mid) * HOVER_OFFSET : 0;
          const ty = isActive ? Math.sin(s.mid) * HOVER_OFFSET : 0;

          return (
            <path
              key={s.key}
              d={arcPath(CX, CY, OUTER_R, INNER_R, s.start, s.end)}
              fill={isActive ? s.hoverFill : s.fill}
              filter={isActive ? 'url(#repoSliceShadowHover)' : 'url(#repoSliceShadow)'}
              transform={`translate(${tx},${ty})`}
              style={{ transition: 'all 0.2s ease-out', cursor: 'pointer' }}
              onMouseEnter={() => setActive(s.key)}
            />
          );
        })}
      </svg>
      <div className={styles.donutLegend}>
        {chartData.map((repo, i) => {
          const slice = slices[i];
          const href =
            repo.name === 'Others'
              ? 'https://github.com/MeshJS'
              : repo.name.startsWith('nomos/')
                ? `https://github.com/nomos-guild/${repo.name.replace('nomos/', '')}`
                : `https://github.com/MeshJS/${repo.name}`;

          return (
            <a
              key={repo.name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.legendItem}
              data-active={active === repo.name ? '' : undefined}
              onMouseEnter={() => setActive(repo.name)}
              onMouseLeave={() => setActive(null)}
            >
              <div
                className={styles.legendColor}
                style={{ background: slice?.legendBg }}
              />
              <span className={styles.legendLabel}>{repo.name}</span>
              <span className={styles.legendValue}>{repo.contributions}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default RepoDonutChart;
