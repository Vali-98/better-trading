import type { ItemPrice } from '../../models/priceTrend'

export function Sparkline({ trend, large }: { trend: ItemPrice['sparkLine']; large: boolean }) {
    const points = trend.data
    const values = points.filter((point): point is number => point !== null)
    const min = Math.min(...values),
        max = Math.max(...values)
    const path = points
        .map((point, index) =>
            point === null
                ? ''
                : `${index === 0 || points[index - 1] === null ? 'M' : 'L'}${(2 + (index / (points.length - 1)) * 116).toFixed(1)},${(max === min ? 16 : 29 - ((point - min) / (max - min)) * 26).toFixed(1)}`
        )
        .join(' ')
    const change = trend.totalChange
    return (
        <span
            className={`bt-trend-chart${large ? ' bt-trend-chart-large' : ''}`}
            data-direction={
                change === undefined || change === 0 ? 'flat' : change < 0 ? 'down' : 'up'
            }>
            <svg
                width={large ? 176 : 88}
                height={large ? 48 : 24}
                viewBox="0 0 120 32"
                role="img"
                aria-label="Recent price trend">
                <path d="M2,30 H118" className="bt-trend-baseline" />
                <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            {change !== undefined && (
                <span className="bt-trend-change">
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)}%
                </span>
            )}
        </span>
    )
}
